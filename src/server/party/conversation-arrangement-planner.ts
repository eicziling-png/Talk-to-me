import { PartyPlanSchema } from "@/domain/party/schema";
import { EXPERTS } from "@/domain/experts/registry";
import type { ExpertSlug } from "@/domain/experts/types";
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
    return applyParticipantPolicy(fallbackPlan(), maxParticipants, request);
  }
}

function applyParticipantPolicy(
  plan: PartyPlan,
  maxParticipants: number,
  request: PartyConversationRequest
): PartyPlan {
  const participantLimit = Math.max(1, Math.min(maxParticipants, plan.participants.length));
  let participants = plan.participants.slice(0, participantLimit).map((participant, index) => ({
    ...participant,
    order: index
  }));

  const targetParticipants = Math.min(maxParticipants, getParticipationTarget(request));
  while (participants.length < targetParticipants) {
    const candidate = chooseComplementaryCandidate(request, participants.map((participant) => participant.expertSlug));
    if (!candidate) {
      break;
    }
    participants = [
      ...participants,
      {
        expertSlug: candidate,
        focus: "从互补视角回应用户当前表达",
        order: participants.length
      }
    ];
  }

  if (request.history.every((message) => message.role === "user") && participants.length === 1) {
    participants = [{
      ...participants[0]!,
      expertSlug: selectOpeningExpert(request.sessionSeed ?? 0),
      order: 0
    }];
  }

  const rotatedParticipants = participants.length === 1 && shouldRotateSoleResponder(request, participants[0]?.expertSlug)
    ? [
        {
          expertSlug: chooseComplementaryCandidate(request, [participants[0]!.expertSlug]) ?? participants[0]!.expertSlug,
          focus: "从另一种角度回应当前表达",
          order: 0
        }
      ]
    : participants;

  return PartyPlanSchema.parse({
    participants: rotatedParticipants,
    messageLimit: Math.max(rotatedParticipants.length, Math.min(plan.messageLimit, maxParticipants))
  });
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

function getParticipationTarget(request: PartyConversationRequest): number {
  const userMessages = request.history.filter((message) => message.role === "user");
  const userTurnCount = userMessages.length + 1;
  const currentInput = request.input;
  const conversationText = [...userMessages.map((message) => message.content), currentInput].join(" ");

  const deepSignals = /(长期|关系模式|内心冲突|存在意义|不同的角度|一直以来|反复|总是)/u;
  const emotionalSignals = /(难过|孤单|孤独|难受|害怕|焦虑|痛苦|失望|因为)/u;

  if (userTurnCount >= 3 && deepSignals.test(conversationText)) {
    return 3;
  }

  if (
    emotionalSignals.test(conversationText) &&
    (userTurnCount >= 3 || (userTurnCount >= 2 && /因为/u.test(currentInput)))
  ) {
    return 2;
  }

  return 1;
}

function chooseComplementaryCandidate(
  request: PartyConversationRequest,
  selectedSlugs: ExpertSlug[]
): ExpertSlug | null {
  const selected = new Set(selectedSlugs);
  const recentCounts = getRecentResponderCounts(request.history);
  const selectedSchools = new Set(
    selectedSlugs
      .map((slug) => EXPERTS.find((expert) => expert.slug === slug)?.school)
      .filter((school): school is string => Boolean(school))
  );

  return (
    EXPERTS.filter((expert) => !selected.has(expert.slug))
      .toSorted((left, right) => {
        const leftScore =
          (recentCounts.get(left.slug) ?? 0) * 10 +
          (selectedSchools.has(left.school) ? 5 : 0);
        const rightScore =
          (recentCounts.get(right.slug) ?? 0) * 10 +
          (selectedSchools.has(right.school) ? 5 : 0);
        return leftScore - rightScore || seededRank(left.slug, request.sessionSeed ?? 0) - seededRank(right.slug, request.sessionSeed ?? 0);
      })[0]?.slug ?? null
  );
}

function selectOpeningExpert(sessionSeed: number): ExpertSlug {
  const openingPool: ExpertSlug[] = [
    "winnicott",
    ...EXPERTS.filter((expert) => expert.slug !== "winnicott").map((expert) => expert.slug)
  ];
  return openingPool[Math.abs(sessionSeed) % openingPool.length] ?? "winnicott";
}

function seededRank(slug: ExpertSlug, sessionSeed: number): number {
  let hash = (sessionSeed ^ 2_166_136_261) >>> 0;
  for (const character of slug) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash;
}

function getRecentResponderCounts(
  history: PartyConversationRequest["history"]
): Map<ExpertSlug, number> {
  const counts = new Map<ExpertSlug, number>();
  for (const message of history) {
    if (message.role !== "expert") {
      continue;
    }
    counts.set(message.expertSlug, (counts.get(message.expertSlug) ?? 0) + 1);
  }
  return counts;
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
