import { describe, expect, it } from "vitest";

import { PartyPlanSchema } from "@/domain/party/schema";
import { buildPerspectiveSupplementPlan } from "@/server/party/party-perspective-supplementation";

const baseRequest = {
  mode: "self-reflection" as const,
  input: "我最近很难过，因为我总觉得自己在关系里会消失。",
  history: [
    { role: "user" as const, content: "我最近很难过" },
    { role: "expert" as const, expertSlug: "winnicott" as const, content: "先让这份感受有一个可以停留的地方。" }
  ]
};

const plan = {
  participants: [
    {
      expertSlug: "winnicott" as const,
      focus: "承接情绪和真实感",
      order: 0,
      responseRole: "primary_responder" as const
    },
    {
      expertSlug: "kohut" as const,
      focus: "补充被看见的需要",
      order: 1,
      responseRole: "supporting_voice" as const
    }
  ],
  messageLimit: 2
};

describe("expert perspective supplementation", () => {
  it("does not trigger artificial interaction for a shallow input", () => {
    const result = buildPerspectiveSupplementPlan(
      { ...baseRequest, input: "hi", history: [] },
      plan
    );

    expect(result).toBeNull();
  });

  it("arranges at most one short integrator perspective for a deep turn", () => {
    const result = buildPerspectiveSupplementPlan(baseRequest, plan);

    expect(result).toEqual({
      expertSlug: "kohut",
      supplementationRole: "integrator",
      referenceExpert: "winnicott",
      outputBudget: "supporting",
      layer: 1
    });
  });

  it("keeps challenger disabled in the Phase 2A schema", () => {
    expect(() =>
      PartyPlanSchema.parse({
        ...plan,
        supplementation: {
          expertSlug: "kohut",
          supplementationRole: "challenger",
          referenceExpert: "winnicott",
          outputBudget: "supporting",
          layer: 1
        }
      })
    ).toThrow();
  });

  it("requires a valid reference expert and a single layer", () => {
    expect(() =>
      PartyPlanSchema.parse({
        ...plan,
        supplementation: {
          expertSlug: "kohut",
          supplementationRole: "integrator",
          referenceExpert: "freud",
          outputBudget: "supporting",
          layer: 2
        }
      })
    ).toThrow();
  });
});
