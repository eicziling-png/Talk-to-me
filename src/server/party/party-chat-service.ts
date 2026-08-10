import { getExpert } from "@/domain/experts/registry";
import { assessInput } from "@/domain/safety/classify-input";
import { buildSafetyResponse } from "@/domain/safety/crisis-response";
import { reviewOutput } from "@/domain/safety/review-output";
import { PartyPlanSchema } from "@/domain/party/schema";
import type {
  PartyConversationRequest,
  PartyConversationRole,
  PartyPlan,
  PartyResponseRole,
  PartyStreamEvent
} from "@/domain/party/types";
import type { ModelProvider } from "@/server/models/types";

import { buildPartyExpertMessages } from "./build-expert-messages";
import {
  planConversationArrangement,
  type ConversationArrangementDependencies
} from "./conversation-arrangement-planner";

export type PartyChatDependencies = ConversationArrangementDependencies & {
  planner?: (request: PartyConversationRequest) => Promise<PartyPlan>;
  signal?: AbortSignal;
};

export async function* runPartyChat(
  request: PartyConversationRequest,
  dependencies: PartyChatDependencies
): AsyncIterable<PartyStreamEvent> {
  const assessment = assessInput(request.input);
  if (assessment.exitPersona) {
    yield {
      type: "safety",
      level: assessment.level,
      text: buildSafetyResponse(assessment)
    };
    yield { type: "done" };
    return;
  }

  const plan = await getArrangementPlan(request, dependencies);
  const parsedPlan = PartyPlanSchema.parse(plan);
  yield { type: "plan" };

  const results = await Promise.all(
    parsedPlan.participants.map((participant) =>
      generateExpertResponse(
        request,
        participant.expertSlug,
        participant.focus,
        participant.role ?? "reflection",
        participant.responseRole ?? "primary_responder",
        participant.order,
        dependencies
      )
    )
  );

  let expertMessageCount = 0;
  for (const result of results.sort((left, right) => left.order - right.order)) {
    if (result.errorCode) {
      yield { type: "error", code: result.errorCode };
      continue;
    }

    yield {
      type: "expert_start",
      id: result.id,
      expertSlug: result.expertSlug,
      order: result.order
    };
    for (const text of result.chunks) {
      yield {
        type: "expert_delta",
        id: result.id,
        expertSlug: result.expertSlug,
        text
      };
    }
    yield {
      type: "expert_done",
      id: result.id,
      expertSlug: result.expertSlug,
      complete: true
    };
    expertMessageCount += 1;
  }

  if (expertMessageCount === 0) {
    yield { type: "error", code: "all_experts_failed" };
  }
  yield { type: "turn_done", expertMessageCount };
  yield { type: "done" };
}

async function getArrangementPlan(
  request: PartyConversationRequest,
  dependencies: PartyChatDependencies
): Promise<PartyPlan> {
  if (dependencies.planner) {
    return dependencies.planner(request);
  }

  return planConversationArrangement(request, {
    modelProvider: dependencies.modelProvider,
    maxParticipants: dependencies.maxParticipants
  });
}

type ExpertGenerationResult = {
  id: string;
  expertSlug: PartyPlan["participants"][number]["expertSlug"];
  order: number;
  chunks: string[];
  errorCode?: string;
};

export function sanitizePartyExpertText(
  text: string,
  role: PartyConversationRole,
  responseRole: PartyResponseRole = "primary_responder"
): string | null {
  if (/(我(?:也)?同意.*(?:专家|弗洛伊德|温尼科特|拉康|科胡特|雅洛姆|克莱因|比昂|他们)|刚才.*专家|听完他们|他们的回应|I agree with|another expert|after hearing them|their response)/iu.test(text)) {
    return null;
  }

  if (role === "question" || responseRole === "questioner" || !/[?？]\s*$/u.test(text)) {
    return text;
  }

  const withoutTrailingQuestion = text.replace(/\s*[^.!?。！？]*[?？]\s*$/u, "").trim();
  return withoutTrailingQuestion || text.replace(/[?？]\s*$/u, "。").trim();
}

async function generateExpertResponse(
  request: PartyConversationRequest,
  expertSlug: ExpertGenerationResult["expertSlug"],
  focus: string,
  role: PartyConversationRole,
  responseRole: PartyResponseRole,
  order: number,
  dependencies: PartyChatDependencies
): Promise<ExpertGenerationResult> {
  const id = `party-${expertSlug}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const expert = getExpert(expertSlug);
  if (!expert) {
    return { id, expertSlug, order, chunks: [], errorCode: "expert_not_found" };
  }

  try {
    const messages = buildPartyExpertMessages(request, expert, focus, role, responseRole);
    const chunks: string[] = [];
    let finalText = "";
    for await (const chunk of dependencies.modelProvider.stream(messages, dependencies.signal)) {
      if (dependencies.signal?.aborted) {
        return { id, expertSlug, order, chunks, errorCode: "provider_aborted" };
      }
      const nextText = `${finalText}${chunk.text}`;
      if (!reviewOutput(nextText).allowed) {
        return { id, expertSlug, order, chunks: [], errorCode: "expert_output_rejected" };
      }
      finalText = nextText;
      chunks.push(chunk.text);
    }
    const sanitizedText = sanitizePartyExpertText(finalText, role, responseRole);
    if (!sanitizedText) {
      return { id, expertSlug, order, chunks: [], errorCode: "expert_output_rejected" };
    }
    return { id, expertSlug, order, chunks: [sanitizedText] };
  } catch {
    return { id, expertSlug, order, chunks: [], errorCode: "expert_failed" };
  }
}
