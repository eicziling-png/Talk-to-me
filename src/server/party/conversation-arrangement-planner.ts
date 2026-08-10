import { PartyPlanSchema } from "@/domain/party/schema";
import type { PartyConversationRequest, PartyPlan } from "@/domain/party/types";
import type { ModelProvider } from "@/server/models/types";

import { buildConversationArrangementMessages } from "./build-planner-messages";

export const PHASE1_MAX_PARTICIPANTS = 3;

export type ConversationArrangementDependencies = {
  modelProvider: ModelProvider;
  maxParticipants?: number;
};

export async function planConversationArrangement(
  request: PartyConversationRequest,
  dependencies: ConversationArrangementDependencies
): Promise<PartyPlan> {
  const maxParticipants = dependencies.maxParticipants ?? PHASE1_MAX_PARTICIPANTS;
  const messages = buildConversationArrangementMessages(request);

  try {
    const rawText = await collectModelText(dependencies.modelProvider, messages);
    const parsed = PartyPlanSchema.parse(JSON.parse(rawText));
    return applyParticipantPolicy(parsed, maxParticipants);
  } catch {
    return fallbackPlan();
  }
}

function applyParticipantPolicy(plan: PartyPlan, maxParticipants: number): PartyPlan {
  const participantLimit = Math.max(1, Math.min(maxParticipants, plan.participants.length));
  const participants = plan.participants.slice(0, participantLimit).map((participant, index) => ({
    ...participant,
    order: index
  }));

  return {
    participants,
    messageLimit: Math.min(plan.messageLimit, participants.length)
  };
}

function fallbackPlan(): PartyPlan {
  return {
    participants: [
      {
        expertSlug: "winnicott",
        focus: "先提供一处可以停留的空间",
        order: 0
      }
    ],
    messageLimit: 1
  };
}

async function collectModelText(
  modelProvider: ModelProvider,
  messages: Parameters<ModelProvider["stream"]>[0]
): Promise<string> {
  let text = "";
  for await (const chunk of modelProvider.stream(messages)) {
    text += chunk.text;
  }
  return text;
}
