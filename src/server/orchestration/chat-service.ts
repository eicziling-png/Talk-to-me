import { ConversationRequestSchema } from "@/domain/conversation/schema";
import type { ConversationRequest } from "@/domain/conversation/types";
import { getExpert } from "@/domain/experts/registry";
import { assessInput } from "@/domain/safety/classify-input";
import { buildSafetyResponse } from "@/domain/safety/crisis-response";
import { reviewOutput } from "@/domain/safety/review-output";
import type { KnowledgeProvider } from "@/server/knowledge/types";
import type { ModelProvider } from "@/server/models/types";

import { buildModelMessages } from "./build-messages";

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
    const chunks: string[] = [];

    for await (const chunk of dependencies.modelProvider.stream(messages, dependencies.signal)) {
      chunks.push(chunk.text);
    }

    const finalText = chunks.join("");
    const review = reviewOutput(finalText);
    if (!review.allowed) {
      yield "这段回复触及了安全边界，已被替换为中性提示。请用教育性、非诊断的方式重新表述问题。";
      return;
    }

    for (const chunk of chunks) {
      yield chunk;
    }
  } catch {
    yield "抱歉，当前回复生成失败。请稍后重试，或改用更简短、教育性的提问。";
  }
}
