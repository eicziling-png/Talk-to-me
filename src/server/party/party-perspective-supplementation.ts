import type {
  PartyConversationRequest,
  PartyPerspectiveSupplement,
  PartyPlan
} from "@/domain/party/types";

const deepSignals = /(因为|长期|关系|内心冲突|存在意义|一直以来|反复|总是|消失|被看见|做不好|害怕|焦虑|难过|孤单|孤独|失望)/u;

export function buildPerspectiveSupplementPlan(
  request: PartyConversationRequest,
  plan: PartyPlan
): PartyPerspectiveSupplement | null {
  if (!shouldSupplement(request) || plan.participants.length < 2) {
    return null;
  }

  const reference = plan.participants.find(
    (participant) => participant.responseRole === "primary_responder"
  ) ?? plan.participants[0];
  const supplement = plan.participants.find(
    (participant) => participant.expertSlug !== reference?.expertSlug
  );

  if (!reference || !supplement) {
    return null;
  }

  return {
    expertSlug: supplement.expertSlug,
    supplementationRole: "integrator",
    referenceExpert: reference.expertSlug,
    outputBudget: "supporting",
    layer: 1
  };
}

function shouldSupplement(request: PartyConversationRequest): boolean {
  const userTurnCount = request.history.filter((message) => message.role === "user").length + 1;
  const currentInput = request.input.trim();
  return userTurnCount >= 2 && currentInput.length >= 12 && deepSignals.test(currentInput);
}
