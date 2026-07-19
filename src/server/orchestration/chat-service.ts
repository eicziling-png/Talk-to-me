import { ConversationRequestSchema } from "@/domain/conversation/schema";
import type { ConversationRequest } from "@/domain/conversation/types";
import { getExpert } from "@/domain/experts/registry";
import { assessInput } from "@/domain/safety/classify-input";
import { buildSafetyResponse } from "@/domain/safety/crisis-response";
import { reviewOutput } from "@/domain/safety/review-output";
import type { KnowledgeProvider } from "@/server/knowledge/types";
import {
  mapModelProviderError,
  type ModelProvider,
  type ModelProviderError
} from "@/server/models/types";

import {
  buildModelMessages,
  estimateModelMessageMetrics,
  type ModelMessage
} from "./build-messages";

export type ChatServiceDependencies = {
  modelProvider: ModelProvider;
  knowledgeProvider: KnowledgeProvider;
  signal?: AbortSignal;
};

export async function* runChat(
  request: ConversationRequest,
  dependencies: ChatServiceDependencies
): AsyncIterable<string> {
  const parsedRequest = ConversationRequestSchema.parse(request);
  const expert = getExpert(parsedRequest.expertSlug);

  if (!expert) {
    yield "我暂时无法找到所选专家。请返回专家列表后重新选择。";
    return;
  }

  const assessment = assessInput(parsedRequest.input);
  if (assessment.exitPersona) {
    yield buildSafetyResponse(assessment);
    return;
  }

  try {
    const messages = buildModelMessages(parsedRequest, expert);
    if (parsedRequest.debug) {
      yield `${formatDebugInput(messages)}\n\nOUTPUT:\n`;
    }

    let finalText = "";
    for await (const chunk of generateWithRecovery(parsedRequest, expert, dependencies)) {
      const nextText = `${finalText}${chunk}`;
      const review = reviewOutput(nextText);
      if (!review.allowed) {
        yield "这段回复触及了安全边界，已被替换为中性提示。请用教育性、非诊断的方式重新表述问题。";
        return;
      }
      finalText = nextText;
      yield chunk;
    }
  } catch (error) {
    logModelFailure("final", mapModelProviderError(error));
    yield "抱歉，刚才连接模型时不太稳定。我已经尝试重连和缩短上下文，但这次还是没成功。你可以稍后再试，或者先发一句更短的话。";
  }
}

async function* generateWithRecovery(
  request: ConversationRequest,
  expert: NonNullable<ReturnType<typeof getExpert>>,
  dependencies: ChatServiceDependencies
): AsyncIterable<string> {
  const attempts = [
    { label: "primary", recentHistoryLimit: undefined },
    { label: "retry", recentHistoryLimit: undefined },
    { label: "compressed", recentHistoryLimit: 4 }
] as const;
  let lastError: ModelProviderError | null = null;
  let yieldedAnyChunk = false;

  for (const attempt of attempts) {
    const messages = buildModelMessages(request, expert, {
      recentHistoryLimit: attempt.recentHistoryLimit,
      forceCompactPersona: attempt.label === "compressed"
    });
    logModelAttempt(attempt.label, messages);

    try {
      for await (const chunk of streamModelText(
        dependencies.modelProvider,
        messages,
        dependencies.signal
      )) {
        yieldedAnyChunk = true;
        yield chunk;
      }
      return;
    } catch (error) {
      lastError = mapModelProviderError(error);
      logModelFailure(attempt.label, lastError);
      if (yieldedAnyChunk) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error("Model provider failed.");
}

async function* streamModelText(
  modelProvider: ModelProvider,
  messages: ModelMessage[],
  signal?: AbortSignal
): AsyncIterable<string> {
  for await (const chunk of modelProvider.stream(messages, signal)) {
    yield chunk.text;
  }
}

function logModelFailure(attempt: string, error: ModelProviderError): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  console.error("chat.model_failure", {
    attempt,
    code: error.code,
    message: error.message,
    diagnostics: error.diagnostics
  });
}

function logModelAttempt(attempt: string, messages: ModelMessage[]): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  console.info("chat.model_attempt", {
    attempt,
    metrics: estimateModelMessageMetrics(messages)
  });
}

function formatDebugInput(messages: ModelMessage[]): string {
  const safety = messages[0]?.content ?? "";
  const engine = messages.find((message) => message.content.includes("Conversation Engine"));
  const expert = messages.find((message) => message.content.includes("Persona identity"));
  const userIndex = messages.findLastIndex((message) => message.content.includes("<user_input>"));
  const historyMessages = userIndex > -1 ? messages.slice(3, userIndex) : [];
  const history = historyMessages
    .map((message) => `${message.role}:\n${message.content}`)
    .join("\n\n");

  return [
    "INPUT:",
    "",
    "system:",
    [safety, engine?.content].filter(Boolean).join("\n\n"),
    "",
    "expert:",
    expert?.content ?? "",
    "",
    "history:",
    history || "(empty)",
    "",
    "user:",
    userIndex > -1 ? messages[userIndex]?.content ?? "" : "",
    "",
    "METRICS:",
    formatMessageMetrics(messages)
  ].join("\n");
}

function formatMessageMetrics(messages: ModelMessage[]): string {
  const metrics = estimateModelMessageMetrics(messages);

  return [
    `message count: ${metrics.messageCount}`,
    `total tokens: ${metrics.totalTokens}`,
    `system tokens: ${metrics.systemTokens}`,
    `expert tokens: ${metrics.expertTokens}`,
    `history tokens: ${metrics.historyTokens}`,
    `user tokens: ${metrics.userTokens}`
  ].join("\n");
}
