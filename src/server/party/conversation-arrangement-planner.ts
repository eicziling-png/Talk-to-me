import { PartyPlanSchema } from "@/domain/party/schema";
import { EXPERTS } from "@/domain/experts/registry";
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
    return applyParticipantPolicy(parsed, maxParticipants, request);
  } catch {
    return fallbackPlan();
  }
}

function applyParticipantPolicy(
  plan: PartyPlan,
  maxParticipants: number,
  request: PartyConversationRequest
): PartyPlan {
  const participantLimit = Math.max(1, Math.min(maxParticipants, plan.participants.length));
  const participants = plan.participants.slice(0, participantLimit).map((participant, index) => ({
    ...participant,
    order: index
  }));

  const rotatedParticipants = shouldRotateSoleResponder(request, participants[0]?.expertSlug)
    ? [
        {
          expertSlug: EXPERTS.find((expert) => expert.slug !== participants[0]?.expertSlug)?.slug ?? participants[0]!.expertSlug,
          focus: "从另一种角度回应当前表达",
          order: 0
        }
      ]
    : participants;

  return {
    participants: rotatedParticipants,
    messageLimit: Math.min(plan.messageLimit, rotatedParticipants.length)
  };
}

function shouldRotateSoleResponder(
  request: PartyConversationRequest,
  currentExpertSlug: PartyPlan["participants"][number]["expertSlug"] | undefined
): boolean {
  if (!currentExpertSlug) {
    return false;
  }

  const lastTurnResponders = getLastTurnResponders(request.history);
  return lastTurnResponders.length === 1 && lastTurnResponders[0] === currentExpertSlug;
}

function getLastTurnResponders(
  history: PartyConversationRequest["history"]
): PartyPlan["participants"][number]["expertSlug"][] {
  let responders: PartyPlan["participants"][number]["expertSlug"][] = [];
  for (const message of history) {
    if (message.role === "user") {
      responders = [];
      continue;
    }
    if (!responders.includes(message.expertSlug)) {
      responders.push(message.expertSlug);
    }
  }
  return responders;
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
