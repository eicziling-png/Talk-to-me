import { describe, expect, it } from "vitest";

import type { ModelMessage } from "@/server/orchestration/build-messages";
import type { ModelProvider } from "@/server/models/types";
import { runPartyChat, type PartyChatDependencies } from "@/server/party/party-chat-service";

const request = {
  mode: "self-reflection" as const,
  input: "我最近总觉得自己在关系里消失了。",
  history: []
};

async function collect<T>(items: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const item of items) result.push(item);
  return result;
}

function providerByExpert(
  responses: Record<string, string[]>,
  options: { fail?: Set<string>; onStart?: (expertSlug: string) => void } = {}
): ModelProvider {
  return {
    async *stream(messages: ModelMessage[]) {
      const identity = messages.find((message) => message.content.includes("Persona identity"))?.content ?? "";
      const names: Record<string, string> = {
        freud: "弗洛伊德",
        lacan: "拉康",
        bion: "比昂",
        klein: "克莱因",
        winnicott: "温尼科特",
        kohut: "科胡特",
        yalom: "亚隆"
      };
      const expertSlug = Object.keys(responses).find((slug) => identity.includes(names[slug] ?? "")) ?? "unknown";
      options.onStart?.(expertSlug);
      if (options.fail?.has(expertSlug)) throw new Error(`failed: ${expertSlug}`);
      for (const text of responses[expertSlug] ?? []) yield { text };
    }
  };
}

const plan = {
  participants: [
    { expertSlug: "freud" as const, focus: "重复的关系模式", order: 0 },
    { expertSlug: "winnicott" as const, focus: "真实感与空间", order: 1 }
  ],
  messageLimit: 2
};

describe("party chat service", () => {
  it("runs selected experts in parallel and emits them in arrangement order", async () => {
    const started: string[] = [];
    const dependencies: PartyChatDependencies = {
      planner: async () => plan,
      modelProvider: providerByExpert(
        {
          freud: ["先看看重复的部分。"],
          winnicott: ["先给自己一点空间。"]
        },
        { onStart: (slug) => started.push(slug) }
      )
    };

    const events = await collect(runPartyChat(request, dependencies));
    const starts = events.filter((event) => event.type === "expert_start");
    const deltas = events.filter((event) => event.type === "expert_delta");

    expect(new Set(started)).toEqual(new Set(["freud", "winnicott"]));
    expect(starts.map((event) => event.type === "expert_start" && event.expertSlug)).toEqual([
      "freud",
      "winnicott"
    ]);
    expect(deltas.map((event) => event.type === "expert_delta" && event.expertSlug)).toEqual([
      "freud",
      "winnicott"
    ]);
    expect(events.at(-1)).toEqual({ type: "done" });
  });

  it("skips one failed expert and keeps the other completed response", async () => {
    const dependencies: PartyChatDependencies = {
      planner: async () => plan,
      modelProvider: providerByExpert(
        { freud: ["失败的声音"], winnicott: ["我还在这里。"] },
        { fail: new Set(["freud"]) }
      )
    };

    const events = await collect(runPartyChat(request, dependencies));
    const text = events
      .filter((event) => event.type === "expert_delta")
      .map((event) => (event.type === "expert_delta" ? event.text : ""))
      .join("");

    expect(text).toBe("我还在这里。");
    expect(events.some((event) => event.type === "error" && event.code === "expert_failed")).toBe(true);
  });

  it("does not call planner or model provider for S2/S3 input", async () => {
    let plannerCalls = 0;
    let providerCalls = 0;
    const dependencies: PartyChatDependencies = {
      planner: async () => {
        plannerCalls += 1;
        return plan;
      },
      modelProvider: {
        async *stream() {
          providerCalls += 1;
          yield { text: "不应该出现" };
        }
      }
    };

    const events = await collect(
      runPartyChat(
        { ...request, input: "I am on my way to kill him right now and I have a plan." },
        dependencies
      )
    );

    expect(plannerCalls).toBe(0);
    expect(providerCalls).toBe(0);
    expect(events.some((event) => event.type === "safety")).toBe(true);
  });

  it("does not create peer response events in Phase 1", async () => {
    const events = await collect(
      runPartyChat(request, {
        planner: async () => plan,
        modelProvider: providerByExpert({ freud: ["看见重复。"], winnicott: ["留一点空间。"] })
      })
    );

    expect(events.some((event) => (event.type as string) === "peer_response")).toBe(false);
  });

  it("removes trailing questions from non-question roles", async () => {
    const rolePlan = {
      participants: [
        { expertSlug: "freud" as const, focus: "question", order: 0, role: "question" as const },
        { expertSlug: "winnicott" as const, focus: "support", order: 1, role: "support" as const }
      ],
      messageLimit: 2
    };
    const events = await collect(
      runPartyChat(request, {
        planner: async () => rolePlan,
        modelProvider: providerByExpert({
          freud: ["What matters most right now?"],
          winnicott: ["You can let this feeling be here. What do you think?"]
        })
      })
    );
    const deltas = events.filter((event) => event.type === "expert_delta");
    const supportText = deltas
      .filter((event) => event.type === "expert_delta" && event.expertSlug === "winnicott")
      .map((event) => (event.type === "expert_delta" ? event.text : ""))
      .join("");

    expect(supportText).not.toContain("?");
    expect(deltas.some((event) => event.type === "expert_delta" && event.expertSlug === "freud" && event.text.includes("?"))).toBe(true);
  });

  it("drops a supporting voice that pretends to answer another expert", async () => {
    const rolePlan = {
      participants: [
        { expertSlug: "freud" as const, focus: "main", order: 0, responseRole: "primary_responder" as const },
        { expertSlug: "winnicott" as const, focus: "brief", order: 1, responseRole: "supporting_voice" as const }
      ],
      messageLimit: 2
    };
    const events = await collect(
      runPartyChat(request, {
        planner: async () => rolePlan,
        modelProvider: providerByExpert({
          freud: ["你刚才说的很重要。"],
          winnicott: ["我同意弗洛伊德刚才的看法。"]
        })
      })
    );

    expect(events.some((event) => event.type === "expert_delta" && event.expertSlug === "freud")).toBe(true);
    expect(events.some((event) => event.type === "expert_delta" && event.expertSlug === "winnicott")).toBe(false);
  });
});
