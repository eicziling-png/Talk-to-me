import type { ModelMessage } from "@/server/orchestration/build-messages";

import {
  type ModelChunk,
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
    const response = await fetch("https://api.openai.com/v1/responses", {
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

    const payload = (await response.json().catch(() => ({}))) as OpenAIResponse;
    if (!response.ok) {
      const providerMessage =
        typeof payload.error?.message === "string" ? payload.error.message : "OpenAI request failed.";
      throw new ModelProviderError("provider_failed", providerMessage);
    }

    const text = extractResponseText(payload);
    if (!text) {
      throw new ModelProviderError("provider_failed", "OpenAI response did not include text.");
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
    const response = await fetch(`${this.#baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.#apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: this.#model,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      }),
      signal
    });

    const payload = (await response.json().catch(() => ({}))) as OpenAIResponse;
    if (!response.ok) {
      const providerMessage =
        typeof payload.error?.message === "string" ? payload.error.message : "Model request failed.";
      throw new ModelProviderError("provider_failed", providerMessage);
    }

    const text = extractResponseText(payload);
    if (!text) {
      throw new ModelProviderError("provider_failed", "Model response did not include text.");
    }

    for (const chunk of chunkText(text)) {
      yield { text: chunk };
    }
  }
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
