import type { ModelMessage } from "@/server/orchestration/build-messages";

import {
  type ModelChunk,
  type ModelProviderDiagnostics,
  type ModelProvider,
  ModelProviderError
} from "./types";

export type ModelProviderEnvironment = {
  MODEL_PROVIDER?: string;
  MODEL_API_KEY?: string;
  MODEL_NAME?: string;
  MODEL_BASE_URL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
} & Record<string, string | undefined>;

type OpenAIResponse = {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      text?: unknown;
      type?: unknown;
    }>;
  }>;
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
  error?: {
    message?: unknown;
  };
};

export function createConfiguredModelProvider(
  env: ModelProviderEnvironment = process.env
): ModelProvider {
  const provider = readOptionalEnv(env, "MODEL_PROVIDER");
  const genericApiKey = readOptionalEnv(env, "MODEL_API_KEY");
  const genericModel = readOptionalEnv(env, "MODEL_NAME");
  const genericBaseUrl = readOptionalEnv(env, "MODEL_BASE_URL");

  if (provider) {
    if (!genericApiKey || !genericModel) {
      return new MinimalFallbackModelProvider();
    }

    if (provider === "openai") {
      return new OpenAIResponsesModelProvider(genericApiKey, genericModel);
    }

    if (provider === "openai-compatible") {
      if (!genericBaseUrl) {
        return new MinimalFallbackModelProvider();
      }

      return new OpenAICompatibleChatModelProvider(
        genericApiKey,
        genericModel,
        genericBaseUrl
      );
    }

    return new MinimalFallbackModelProvider();
  }

  const legacyApiKey = readOptionalEnv(env, "OPENAI_API_KEY");
  const legacyModel = readOptionalEnv(env, "OPENAI_MODEL");

  if (!legacyApiKey || !legacyModel) {
    return new MinimalFallbackModelProvider();
  }

  return new OpenAIResponsesModelProvider(legacyApiKey, legacyModel);
}

class MinimalFallbackModelProvider implements ModelProvider {
  async *stream(_messages: ModelMessage[]): AsyncIterable<ModelChunk> {
    yield {
      text: [
        "当前还没有连接真实对话模型，所以我不能假装心理学专家继续聊天。",
        "请先配置 MODEL_PROVIDER、MODEL_API_KEY 和 MODEL_NAME；",
        "如果使用 DeepSeek 等兼容接口，还需要配置 MODEL_BASE_URL。",
        "旧的 OPENAI_API_KEY 和 OPENAI_MODEL 配置仍然兼容。"
      ].join("")
    };
  }
}

class OpenAIResponsesModelProvider implements ModelProvider {
  readonly #apiKey: string;
  readonly #model: string;

  constructor(apiKey: string, model: string) {
    this.#apiKey = apiKey;
    this.#model = model;
  }

  async *stream(messages: ModelMessage[], signal?: AbortSignal): AsyncIterable<ModelChunk> {
    const endpoint = "https://api.openai.com/v1/responses";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.#apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: this.#model,
        input: messages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      }),
      signal
    });

    const responseBody = await response.text().catch(() => "");
    const payload = parseProviderJson(responseBody);
    if (!response.ok) {
      const providerMessage =
        typeof payload.error?.message === "string" ? payload.error.message : "OpenAI request failed.";
      throw new ModelProviderError(
        "provider_failed",
        providerMessage,
        buildProviderDiagnostics({
          provider: "openai",
          endpoint,
          messages,
          response,
          responseBody,
          apiErrorMessage: providerMessage
        })
      );
    }

    const text = extractResponseText(payload);
    if (!text) {
      throw new ModelProviderError(
        "provider_failed",
        "OpenAI response did not include text.",
        buildProviderDiagnostics({
          provider: "openai",
          endpoint,
          messages,
          response,
          responseBody,
          apiErrorMessage: "OpenAI response did not include text."
        })
      );
    }

    for (const chunk of chunkText(text)) {
      yield { text: chunk };
    }
  }
}

class OpenAICompatibleChatModelProvider implements ModelProvider {
  readonly #apiKey: string;
  readonly #model: string;
  readonly #baseUrl: string;

  constructor(apiKey: string, model: string, baseUrl: string) {
    this.#apiKey = apiKey;
    this.#model = model;
    this.#baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async *stream(messages: ModelMessage[], signal?: AbortSignal): AsyncIterable<ModelChunk> {
    const endpoint = `${this.#baseUrl}/chat/completions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.#apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: this.#model,
        stream: true,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      }),
      signal
    });

    if (response.ok && response.body && isEventStreamResponse(response)) {
      let yielded = false;
      for await (const text of parseChatCompletionStream(response.body)) {
        yielded = true;
        yield { text };
      }

      if (!yielded) {
        throw new ModelProviderError(
          "provider_failed",
          "Model response did not include text.",
          buildProviderDiagnostics({
            provider: "openai-compatible",
            endpoint,
            messages,
            response,
            responseBody: "",
            apiErrorMessage: "Model response did not include text."
          })
        );
      }
      return;
    }

    const responseBody = await response.text().catch(() => "");
    const payload = parseProviderJson(responseBody);
    if (!response.ok) {
      const providerMessage =
        typeof payload.error?.message === "string" ? payload.error.message : "Model request failed.";
      throw new ModelProviderError(
        "provider_failed",
        providerMessage,
        buildProviderDiagnostics({
          provider: "openai-compatible",
          endpoint,
          messages,
          response,
          responseBody,
          apiErrorMessage: providerMessage
        })
      );
    }

    const text = extractResponseText(payload);
    if (!text) {
      throw new ModelProviderError(
        "provider_failed",
        "Model response did not include text.",
        buildProviderDiagnostics({
          provider: "openai-compatible",
          endpoint,
          messages,
          response,
          responseBody,
          apiErrorMessage: "Model response did not include text."
        })
      );
    }

    for (const chunk of chunkText(text)) {
      yield { text: chunk };
    }
  }
}

function isEventStreamResponse(response: Response): boolean {
  return response.headers.get("content-type")?.includes("text/event-stream") ?? false;
}

async function* parseChatCompletionStream(
  body: ReadableStream<Uint8Array>
): AsyncIterable<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split(/\n\n+/);
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const text = parseChatCompletionFrame(frame);
      if (text) {
        yield text;
      }
    }
  }

  buffer += decoder.decode();
  const text = parseChatCompletionFrame(buffer);
  if (text) {
    yield text;
  }
}

function parseChatCompletionFrame(frame: string): string {
  const dataLines = frame
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s*/, ""));

  for (const data of dataLines) {
    if (data === "[DONE]") {
      continue;
    }

    try {
      const payload = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: unknown }; message?: { content?: unknown } }>;
      };
      const text = payload.choices?.[0]?.delta?.content ?? payload.choices?.[0]?.message?.content;
      if (typeof text === "string") {
        return text;
      }
    } catch {
      continue;
    }
  }

  return "";
}

function parseProviderJson(responseBody: string): OpenAIResponse {
  try {
    return JSON.parse(responseBody) as OpenAIResponse;
  } catch {
    return {};
  }
}

function buildProviderDiagnostics(input: {
  provider: string;
  endpoint: string;
  messages: ModelMessage[];
  response: Response;
  responseBody: string;
  apiErrorMessage: string;
}): ModelProviderDiagnostics {
  return {
    provider: input.provider,
    endpoint: input.endpoint,
    httpStatus: input.response.status,
    apiErrorMessage: input.apiErrorMessage,
    responseBody: input.responseBody.slice(0, 4_000),
    ...estimateMessageTokens(input.messages)
  };
}

function estimateMessageTokens(messages: ModelMessage[]): Required<
  Pick<
    ModelProviderDiagnostics,
    "messageCount" | "tokenEstimate" | "systemTokens" | "historyTokens" | "userTokens"
  >
> {
  let systemTokens = 0;
  let historyTokens = 0;
  let userTokens = 0;

  for (const message of messages) {
    const tokens = estimateTextTokens(message.content);
    if (message.content.includes("Conversation history") || message.content.includes("Prior user message")) {
      historyTokens += tokens;
    } else if (message.role === "user") {
      userTokens += tokens;
    } else {
      systemTokens += tokens;
    }
  }

  return {
    messageCount: messages.length,
    tokenEstimate: systemTokens + historyTokens + userTokens,
    systemTokens,
    historyTokens,
    userTokens
  };
}

function estimateTextTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function extractResponseText(payload: OpenAIResponse): string {
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  const outputText = payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => typeof text === "string")
    .join("");

  if (outputText) {
    return outputText;
  }

  const choiceText = payload.choices?.[0]?.message?.content;
  return typeof choiceText === "string" ? choiceText : "";
}

function chunkText(text: string): string[] {
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]?\s*/g) ?? [text];

  return sentences.map((sentence) => sentence.trimStart()).filter(Boolean);
}

function readOptionalEnv(
  env: ModelProviderEnvironment,
  key: keyof ModelProviderEnvironment
): string | null {
  const value = env[key];

  return value?.trim() || null;
}
