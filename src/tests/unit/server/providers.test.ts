import { describe, expect, it } from "vitest";

import { getExpert } from "@/domain/experts/registry";
import type { ConversationRequest } from "@/domain/conversation/types";
import { runChat } from "@/server/orchestration/chat-service";
import { buildModelMessages } from "@/server/orchestration/build-messages";
import { createConfiguredModelProvider } from "@/server/models/configured-provider";
import { FakeModelProvider } from "@/server/models/fake-provider";
import { mapModelProviderError, ModelProviderError } from "@/server/models/types";
import { NullKnowledgeProvider } from "@/server/knowledge/null-provider";

async function collectText(stream: AsyncIterable<{ text: string }>): Promise<string[]> {
  const chunks: string[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk.text);
  }

  return chunks;
}

describe("model provider boundaries", () => {
  it("streams fake model chunks in configured order", async () => {
    const provider = new FakeModelProvider(["first", " second", " third"]);
    const expert = getExpert("freud");

    expect(expert).toBeDefined();

    const messages = buildModelMessages(
      {
        expertSlug: "freud",
        mode: "theory-classroom",
        input: "Explain repression.",
        history: []
      },
      expert!
    );

    await expect(collectText(provider.stream(messages))).resolves.toEqual([
      "first",
      " second",
      " third"
    ]);
  });

  it("maps aborts to an explicit typed provider error", async () => {
    const controller = new AbortController();
    controller.abort();
    const provider = new FakeModelProvider(["unreached"]);

    await expect(collectText(provider.stream([], controller.signal))).rejects.toMatchObject({
      code: "provider_aborted"
    });
  });

  it("maps unknown provider failures to safe typed errors", () => {
    const mapped = mapModelProviderError(new Error("raw vendor failure with sensitive details"));

    expect(mapped).toBeInstanceOf(ModelProviderError);
    expect(mapped.code).toBe("provider_failed");
    expect(mapped.message).not.toContain("sensitive details");
  });

  it("uses a Chinese embodied fallback when configured model credentials are absent", async () => {
    const provider = createConfiguredModelProvider({});
    const expert = getExpert("winnicott");

    expect(expert).toBeDefined();

    const messages = buildModelMessages(
      {
        expertSlug: "winnicott",
        mode: "self-reflection",
        input: "我今天很难过",
        history: []
      },
      expert!
    );

    const chunks = await collectText(provider.stream(messages));
    const response = chunks.join("");

    expect(response).toContain("听起来");
    expect(response).toContain("难过");
    expect(response).not.toContain("AI");
    expect(response).not.toContain("simulation");
    expect(response).not.toContain("educational simulation");
    expect(response).not.toContain("holding environment");
    expect(response).not.toContain("Winnicott-inspired");
  });

  it("keeps Bion fallback from exposing technical theory terms", async () => {
    const provider = createConfiguredModelProvider({});
    const expert = getExpert("bion");

    expect(expert).toBeDefined();

    const messages = buildModelMessages(
      {
        expertSlug: "bion",
        mode: "self-reflection",
        input: "我脑子里很乱，说不清楚，只觉得快被压垮了。",
        history: []
      },
      expert!
    );

    const response = (await collectText(provider.stream(messages))).join("");

    expect(response).toContain("很难被整理成一句话");
    expect(response).not.toContain("alpha function");
    expect(response).not.toContain("container");
    expect(response).not.toContain("beta element");
    expect(response).not.toContain("模拟");
  });

  it("keeps fallback replies conversational and free of report formatting", async () => {
    const provider = createConfiguredModelProvider({});
    const expert = getExpert("freud");

    expect(expert).toBeDefined();

    const messages = buildModelMessages(
      {
        expertSlug: "freud",
        mode: "self-reflection",
        input: "我觉得自己很失败。",
        history: []
      },
      expert!
    );

    const response = (await collectText(provider.stream(messages))).join("");

    expect(response.length).toBeLessThanOrEqual(200);
    expect(response).not.toMatch(/#{1,6}\s/);
    expect(response).not.toMatch(/\n\s*[-*]\s/);
    expect(response).not.toContain("Step 1");
    expect(response).not.toContain("分析过程");
    expect(response).not.toContain("根据");
    expect(response).toMatch(/[？?]/);
  });

  it("constructs configured provider from explicit environment without exposing secrets", () => {
    const provider = createConfiguredModelProvider({
      OPENAI_API_KEY: "secret-key",
      OPENAI_MODEL: "explicit-test-model"
    });

    expect(provider).toHaveProperty("stream");
    expect(JSON.stringify(provider)).not.toContain("secret-key");
  });
});

describe("knowledge provider boundaries", () => {
  it("returns empty MVP knowledge results from the null provider", async () => {
    const provider = new NullKnowledgeProvider();

    await expect(provider.search("jung", "archetypes")).resolves.toEqual([]);
  });
});

describe("chat orchestration provider integration", () => {
  it("accepts formal model and knowledge provider interfaces", async () => {
    const request: ConversationRequest = {
      expertSlug: "yalom",
      mode: "critical-discussion",
      input: "How does existential isolation differ from loneliness?",
      history: []
    };
    const modelProvider = new FakeModelProvider(["A bounded educational answer."]);
    const knowledgeProvider = new NullKnowledgeProvider();
    const chunks: string[] = [];

    for await (const chunk of runChat(request, { modelProvider, knowledgeProvider })) {
      chunks.push(chunk);
    }

    expect(chunks.join("")).toBe("A bounded educational answer.");
  });
});
