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
});
