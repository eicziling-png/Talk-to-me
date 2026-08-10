import { describe, expect, it } from "vitest";

import type { ModelMessage } from "@/server/orchestration/build-messages";
import type { ModelProvider } from "@/server/models/types";
import {
  PHASE1_MAX_PARTICIPANTS,
  planConversationArrangement
} from "@/server/party/conversation-arrangement-planner";

const request = {
  mode: "self-reflection" as const,
  input: "我最近总觉得自己在关系里消失了。",
  history: []
};

function providerFromJson(value: unknown, onCall?: (messages: ModelMessage[]) => void): ModelProvider {
  return {
    async *stream(messages) {
      onCall?.(messages);
      yield { text: JSON.stringify(value) };
    }
  };
}

describe("conversation arrangement planner", () => {
  it("selects and orders participants while applying the Phase 1 runtime cap", async () => {
    const plan = await planConversationArrangement(request, {
      modelProvider: providerFromJson({
        participants: [
          { expertSlug: "freud", focus: "重复的关系模式", order: 0 },
          { expertSlug: "lacan", focus: "被谁看见", order: 1 },
          { expertSlug: "winnicott", focus: "真实感与空间", order: 2 },
          { expertSlug: "yalom", focus: "选择与孤独", order: 3 }
        ],
        messageLimit: 4
      })
    });

    expect(PHASE1_MAX_PARTICIPANTS).toBe(3);
    expect(plan.participants.map((participant) => participant.expertSlug)).toEqual([
      "freud",
      "lacan",
      "winnicott"
    ]);
    expect(plan.messageLimit).toBe(3);
  });

  it("returns a safe one-expert fallback when the planner provider fails", async () => {
    const plan = await planConversationArrangement(request, {
      modelProvider: {
        async *stream() {
          throw new Error("planner unavailable");
        }
      }
    });

    expect(plan).toEqual({
      participants: [
        { expertSlug: "winnicott", focus: "先提供一处可以停留的空间", order: 0 }
      ],
      messageLimit: 1
    });
  });

  it("applies participation rotation even when the planner falls back", async () => {
    const plan = await planConversationArrangement(
      {
        ...request,
        history: [
          { role: "user", content: "我好孤单" },
          { role: "expert", expertSlug: "winnicott", content: "我会陪你停留在这里。" }
        ]
      },
      {
        modelProvider: {
          async *stream() {
            throw new Error("planner unavailable");
          }
        }
      }
    );

    expect(plan.participants).toHaveLength(1);
    expect(plan.participants[0]?.expertSlug).not.toBe("winnicott");
  });

  it("does not expose planner output as a user-facing response", async () => {
    let captured: ModelMessage[] = [];
    await planConversationArrangement(request, {
      modelProvider: providerFromJson(
        {
          participants: [{ expertSlug: "yalom", focus: "此刻仍然重要的事", order: 0 }],
          messageLimit: 1
        },
        (messages) => {
          captured = messages;
        }
      )
    });

    expect(captured.every((message) => message.role === "system" || message.role === "user")).toBe(true);
  });

  it("rotates away from the previous sole responder on the next turn", async () => {
    const plan = await planConversationArrangement(
      {
        ...request,
        history: [
          { role: "user", content: "我好难过" },
          { role: "expert", expertSlug: "winnicott", content: "我先陪你停留在这里。" }
        ]
      },
      {
        modelProvider: providerFromJson({
          participants: [{ expertSlug: "winnicott", focus: "继续陪伴", order: 0 }],
          messageLimit: 1
        })
      }
    );

    expect(plan.participants).toHaveLength(1);
    expect(plan.participants[0]?.expertSlug).not.toBe("winnicott");
  });

  it("includes hidden multi-turn participation guidance in the planner prompt", async () => {
    let captured: ModelMessage[] = [];
    await planConversationArrangement(
      {
        ...request,
        history: [
          { role: "user", content: "我好孤单" },
          { role: "expert", expertSlug: "winnicott", content: "我听见你的孤单。" }
        ]
      },
      {
        modelProvider: providerFromJson(
          {
            participants: [{ expertSlug: "yalom", focus: "此刻的孤单", order: 0 }],
            messageLimit: 1
          },
          (messages) => {
            captured = messages;
          }
        )
      }
    );

    expect(captured.map((message) => message.content).join("\n")).toContain("sole responder");
  });

  it("adds a complementary participant when the conversation reaches clear emotional depth", async () => {
    const plan = await planConversationArrangement(
      {
        ...request,
        input: "我最近很难过，因为我总是在关系里退缩，也不知道该怎么办。",
        history: [
          { role: "user", content: "我最近很难过" },
          { role: "expert", expertSlug: "winnicott", content: "先让这份感受有一个可以停留的地方。" },
          { role: "user", content: "我总觉得自己在关系里会消失" },
          { role: "expert", expertSlug: "winnicott", content: "这像是一种熟悉的退缩。" }
        ]
      },
      {
        modelProvider: providerFromJson({
          participants: [{ expertSlug: "winnicott", focus: "承接情绪", order: 0 }],
          messageLimit: 1
        })
      }
    );

    expect(plan.participants.length).toBeGreaterThanOrEqual(2);
    expect(plan.participants.map((participant) => participant.expertSlug)).toContain("winnicott");
    expect(new Set(plan.participants.map((participant) => participant.expertSlug)).size).toBeGreaterThan(1);
    expect(plan.messageLimit).toBeGreaterThanOrEqual(plan.participants.length);
  });

  it("keeps the final plan contract valid after depth expansion", async () => {
    const plan = await planConversationArrangement(
      {
        ...request,
        input: "\u6211\u6700\u8fd1\u5f88\u96be\u8fc7\uff0c\u56e0\u4e3a\u540c\u4e00\u79cd\u5173\u7cfb\u6a21\u5f0f\u4e00\u76f4\u53cd\u590d\uff0c\u6211\u4e0d\u77e5\u9053\u8be5\u600e\u4e48\u529e\u3002",
        history: [
          { role: "user", content: "I have been feeling lonely" },
          { role: "expert", expertSlug: "winnicott", content: "I am here with you." },
          { role: "user", content: "I keep disappearing in relationships" },
          { role: "expert", expertSlug: "freud", content: "Let us notice what repeats." }
        ],
        sessionSeed: 7
      },
      {
        modelProvider: providerFromJson({
          participants: [{ expertSlug: "winnicott", focus: "holding", order: 0 }],
          messageLimit: 1
        })
      }
    );

    expect(plan.participants.length).toBeGreaterThan(1);
    expect(plan.messageLimit).toBeGreaterThanOrEqual(plan.participants.length);
    expect(plan.participants.length).toBeLessThanOrEqual(PHASE1_MAX_PARTICIPANTS);
  });

  it("varies shallow openings by session seed while keeping a seed stable", async () => {
    const makePlan = (sessionSeed: number) =>
      planConversationArrangement(
        { ...request, input: "hi", sessionSeed },
        {
          modelProvider: providerFromJson({
            participants: [{ expertSlug: "winnicott", focus: "welcome", order: 0 }],
            messageLimit: 1
          })
        }
      );

    const [first, repeat, second] = await Promise.all([makePlan(1), makePlan(1), makePlan(2)]);

    expect(repeat.participants[0]?.expertSlug).toBe(first.participants[0]?.expertSlug);
    expect(second.participants[0]?.expertSlug).not.toBe(first.participants[0]?.expertSlug);
  });

  it("does not keep alternating the same two sole responders across deep turns", async () => {
    const plan = await planConversationArrangement(
      {
        ...request,
        input: "我想把这些长期的关系模式说清楚，也想听听不同的角度。",
        history: [
          { role: "user", content: "我最近很难过，因为我总是在关系里退缩" },
          { role: "expert", expertSlug: "freud", content: "也许可以留意反复出现的愿望。" },
          { role: "user", content: "我又回到了同样的关系模式" },
          { role: "expert", expertSlug: "winnicott", content: "我们可以看看这份经验如何被承受。" }
        ]
      },
      {
        modelProvider: providerFromJson({
          participants: [{ expertSlug: "freud", focus: "重复的关系模式", order: 0 }],
          messageLimit: 1
        })
      }
    );

    expect(plan.participants.length).toBeGreaterThanOrEqual(2);
    expect(plan.participants.map((participant) => participant.expertSlug)).not.toEqual(["freud"]);
  });
});
