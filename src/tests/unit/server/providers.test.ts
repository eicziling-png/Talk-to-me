import { afterEach, describe, expect, it, vi } from "vitest";

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
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("does not pretend to be an expert chat model when credentials are absent", async () => {
    const provider = createConfiguredModelProvider({});
    const expert = getExpert("winnicott");

    expect(expert).toBeDefined();

    const messages = buildModelMessages(
      {
        expertSlug: "winnicott",
        mode: "self-reflection",
        input: "你好",
        history: []
      },
      expert!
    );

    const response = (await collectText(provider.stream(messages))).join("");

    expect(response).toContain("还没有连接真实对话模型");
    expect(response).toContain("OPENAI_API_KEY");
    expect(response).toContain("OPENAI_MODEL");
    expect(response).not.toContain("我听到了");
    expect(response).not.toContain("你刚才说的是这句话本身");
    expect(response).not.toContain("我先不多猜");
    expect(response).not.toContain("刚刚提到的事情");
  });

  it("calls the configured model provider with the exact built messages", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          output_text: "你好，很高兴见到你。今天怎么样？"
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const provider = createConfiguredModelProvider({
      OPENAI_API_KEY: "secret-key",
      OPENAI_MODEL: "test-model"
    });
    const expert = getExpert("winnicott");

    expect(expert).toBeDefined();

    const messages = buildModelMessages(
      {
        expertSlug: "winnicott",
        mode: "self-reflection",
        input: "你好",
        history: []
      },
      expert!
    );

    const response = (await collectText(provider.stream(messages))).join("");
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));

    expect(response).toBe("你好，很高兴见到你。今天怎么样？");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer secret-key"
        })
      })
    );
    expect(request.model).toBe("test-model");
    expect(JSON.stringify(request.input)).toContain("Current user input");
    expect(JSON.stringify(request.input)).toContain("你好");
  });

  it("keeps configured provider replies conversational and free of report formatting", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          output_text: "这句话听起来很重。你最近是在什么情况下最容易这样看自己？"
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const provider = createConfiguredModelProvider({
      OPENAI_API_KEY: "secret-key",
      OPENAI_MODEL: "explicit-test-model"
    });
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
