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
    expect(response).toContain("MODEL_API_KEY");
    expect(response).toContain("MODEL_NAME");
    expect(response).toContain("MODEL_PROVIDER");
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

  it("calls an OpenAI-compatible chat completions provider from generic model configuration", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "当然，可以聊聊。你今天想从哪儿开始？" } }]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const provider = createConfiguredModelProvider({
      MODEL_PROVIDER: "openai-compatible",
      MODEL_API_KEY: "deepseek-secret",
      MODEL_NAME: "deepseek-chat",
      MODEL_BASE_URL: "https://api.deepseek.com/v1"
    });
    const expert = getExpert("yalom");

    expect(expert).toBeDefined();

    const messages = buildModelMessages(
      {
        expertSlug: "yalom",
        mode: "self-reflection",
        input: "陪我聊聊吧",
        history: [{ role: "user", content: "hi" }]
      },
      expert!
    );

    const response = (await collectText(provider.stream(messages))).join("");
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));

    expect(response).toBe("当然，可以聊聊。你今天想从哪儿开始？");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.deepseek.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer deepseek-secret"
        })
      })
    );
    expect(request.model).toBe("deepseek-chat");
    expect(request.stream).toBe(true);
    expect(JSON.stringify(request.messages)).toContain("Conversation Engine");
    expect(JSON.stringify(request.messages)).toContain("陪我聊聊吧");
  });

  it("streams OpenAI-compatible chat completion deltas as they arrive", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        [
          'data: {"choices":[{"delta":{"content":"你"}}]}',
          "",
          'data: {"choices":[{"delta":{"content":"好"}}]}',
          "",
          "data: [DONE]",
          ""
        ].join("\n"),
        { status: 200, headers: { "content-type": "text/event-stream" } }
      )
    );
    const provider = createConfiguredModelProvider({
      MODEL_PROVIDER: "openai-compatible",
      MODEL_API_KEY: "deepseek-secret",
      MODEL_NAME: "deepseek-chat",
      MODEL_BASE_URL: "https://api.deepseek.com/v1"
    });

    await expect(collectText(provider.stream([{ role: "user", content: "hi" }]))).resolves.toEqual([
      "你",
      "好"
    ]);
  });

  it("includes provider HTTP diagnostics when OpenAI-compatible calls fail", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { message: "maximum context length exceeded" }
        }),
        { status: 400, headers: { "content-type": "application/json" } }
      )
    );
    const provider = createConfiguredModelProvider({
      MODEL_PROVIDER: "openai-compatible",
      MODEL_API_KEY: "deepseek-secret",
      MODEL_NAME: "deepseek-chat",
      MODEL_BASE_URL: "https://api.deepseek.com/v1"
    });

    await expect(
      collectText(
        provider.stream([
          { role: "system", content: "system prompt" },
          { role: "user", content: "hello" }
        ])
      )
    ).rejects.toMatchObject({
      code: "provider_failed",
      diagnostics: expect.objectContaining({
        httpStatus: 400,
        apiErrorMessage: "maximum context length exceeded",
        responseBody: expect.stringContaining("maximum context length exceeded"),
        messageCount: 2,
        tokenEstimate: expect.any(Number),
        systemTokens: expect.any(Number),
        historyTokens: expect.any(Number),
        userTokens: expect.any(Number)
      })
    });
  });

  it("uses the OpenAI responses provider from generic OpenAI configuration", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ output_text: "你好，我们可以慢慢聊。" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const provider = createConfiguredModelProvider({
      MODEL_PROVIDER: "openai",
      MODEL_API_KEY: "generic-openai-secret",
      MODEL_NAME: "gpt-4.1-mini"
    });

    const response = (await collectText(provider.stream([{ role: "user", content: "你好" }]))).join(
      ""
    );
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));

    expect(response).toBe("你好，我们可以慢慢聊。");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer generic-openai-secret"
        })
      })
    );
    expect(request.model).toBe("gpt-4.1-mini");
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

    await expect(provider.search("lacan", "language and desire")).resolves.toEqual([]);
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
