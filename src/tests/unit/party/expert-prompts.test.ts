import { describe, expect, it } from "vitest";

import { getExpert } from "@/domain/experts/registry";
import { buildPartyExpertMessages } from "@/server/party/build-expert-messages";

const request = {
  mode: "self-reflection" as const,
  input: "我最近总觉得自己在关系里消失了。",
  history: []
};

describe("party expert prompts", () => {
  it("keeps safety, engine, room rules, identity, and delimited user data", () => {
    const expert = getExpert("winnicott");
    if (!expert) throw new Error("Expected Winnicott profile");

    const messages = buildPartyExpertMessages(request, expert, "先关注真实感和可以停留的空间");
    const content = messages.map((message) => message.content).join("\n");

    expect(content).toContain("Safety instructions");
    expect(content).toContain("Conversation Engine");
    expect(content).toContain("Party room rules");
    expect(content).toContain("Persona identity");
    expect(content).toContain("温尼科特");
    expect(content).toContain("<user_input>");
    expect(content).toContain("先关注真实感和可以停留的空间");
    expect(content).toContain("不要说自己是 AI");
  });

  it("keeps the seven expert voices materially distinct", () => {
    const slugs = ["freud", "lacan", "bion", "klein", "winnicott", "kohut", "yalom"] as const;
    const prompts = slugs.map((slug) => {
      const expert = getExpert(slug);
      if (!expert) throw new Error(`Expected ${slug} profile`);
      return (
        buildPartyExpertMessages(request, expert, `${slug} focus`).find((message) =>
          message.content.includes("Persona identity")
        )?.content ?? ""
      );
    });

    expect(new Set(prompts).size).toBe(7);
    expect(prompts.join("\n")).not.toContain("你是一个 AI 助手");
  });

  it("prevents experts from explaining absent participants or hidden orchestration", () => {
    const expert = getExpert("freud");
    if (!expert) throw new Error("Expected Freud profile");

    const content = buildPartyExpertMessages(request, expert, "notice the user's conflict").map(
      (message) => message.content
    ).join("\n");

    expect(content).toContain("one of seven historical psychologists");
    expect(content).toContain("Never say that other experts are absent");
    expect(content).toContain("Never explain why another expert did not respond");
    expect(content).toContain("never mention planner");
  });

  it("gives non-question roles an explicit no-follow-up-question rule", () => {
    const expert = getExpert("winnicott");
    if (!expert) throw new Error("Expected Winnicott profile");

    const content = buildPartyExpertMessages(request, expert, "hold the feeling", "support", "listener")
      .map((message) => message.content)
      .join("\n");

    expect(content).toContain("support");
    expect(content).toContain("Only the question role may ask an open question");
    expect(content).toContain("Do not end with a question");
    expect(content).toContain("You may only respond to the user");
    expect(content).toContain("Never mention or agree with another expert");
  });
});
