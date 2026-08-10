import { describe, expect, it } from "vitest";

import {
  PartyConversationRequestSchema,
  PartyPlanSchema,
  PartyStreamEventSchema
} from "@/domain/party/schema";

describe("party schemas", () => {
  it("accepts the Phase 1 self-reflection request shape", () => {
    const request = PartyConversationRequestSchema.parse({
      mode: "self-reflection",
      input: "我最近总觉得自己和周围隔着一点距离。",
      history: []
    });

    expect(request.mode).toBe("self-reflection");
    expect(request.history).toEqual([]);
  });

  it("keeps participant count extensible beyond the Phase 1 runtime policy", () => {
    const plan = PartyPlanSchema.parse({
      participants: [
        { expertSlug: "freud", focus: "梦与欲望", order: 0 },
        { expertSlug: "lacan", focus: "语言中的裂缝", order: 1 },
        { expertSlug: "bion", focus: "承受混乱", order: 2 },
        { expertSlug: "yalom", focus: "此刻的存在", order: 3 }
      ],
      messageLimit: 4
    });

    expect(plan.participants).toHaveLength(4);
  });

  it("rejects duplicate experts and unknown stream event types", () => {
    expect(() =>
      PartyPlanSchema.parse({
        participants: [
          { expertSlug: "freud", focus: "first", order: 0 },
          { expertSlug: "freud", focus: "second", order: 1 }
        ],
        messageLimit: 2
      })
    ).toThrow();

    expect(() =>
      PartyStreamEventSchema.parse({
        type: "unknown",
        value: "not an event"
      })
    ).toThrow();
  });

  it("keeps planner stream events opaque to the browser", () => {
    expect(PartyStreamEventSchema.parse({ type: "plan" })).toEqual({ type: "plan" });

    expect(() =>
      PartyStreamEventSchema.parse({
        type: "plan",
        selectedExpertSlugs: ["winnicott"],
        messageLimit: 1
      })
    ).toThrow();
  });

  it("rejects empty user input and unsupported modes", () => {
    expect(() =>
      PartyConversationRequestSchema.parse({
        mode: "self-reflection",
        input: "   ",
        history: []
      })
    ).toThrow();

    expect(() =>
      PartyConversationRequestSchema.parse({
        mode: "theory-classroom",
        input: "请和我聊聊。",
        history: []
      })
    ).toThrow();
  });
});
