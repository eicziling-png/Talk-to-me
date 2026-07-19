import type { ModelMessage } from "@/server/orchestration/build-messages";

import {
  type ModelChunk,
  type ModelProvider,
  ModelProviderError
} from "./types";

export type ModelProviderEnvironment = {
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
  const apiKey = readOptionalEnv(env, "OPENAI_API_KEY");
  const model = readOptionalEnv(env, "OPENAI_MODEL");

  if (!apiKey || !model) {
    return new MinimalFallbackModelProvider();
  }

  return new ConfiguredModelProvider(apiKey, model);
}

class MinimalFallbackModelProvider implements ModelProvider {
  async *stream(messages: ModelMessage[]): AsyncIterable<ModelChunk> {
    const response = buildMinimalFallbackResponse(readUserInput(messages), readHistory(messages));

    yield { text: response };
  }
}

class ConfiguredModelProvider implements ModelProvider {
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

function buildMinimalFallbackResponse(userInput: string, history: ModelMessage[]): string {
  const normalizedInput = userInput.trim().toLowerCase();
  const previousAssistant = [...history].reverse().find((message) => message.role === "assistant");
  const previousAssistantText = previousAssistant?.content ?? "";

  if (/^(你?好|您好|hi|hello|hey|哈喽|在吗)[。！!？?\s]*$/i.test(normalizedInput)) {
    return "你好，很高兴见到你。今天怎么样？";
  }

  if (/我说啥了|我说什么了|你听到什么了|听到了什么|我提什么了/.test(userInput)) {
    return "你说得对，我刚才不该默认你已经提到了一件事。你只是说“一般”，我应该先回应这个。";
  }

  if (/^(一般|还好|嗯|没事|还行|一般般)[。！!？?\s]*$/.test(userInput.trim())) {
    const response = "一般啊。是那种平平淡淡的一天，还是有点累、但暂时不太想多说？";
    return response === previousAssistantText
      ? "听起来就是一般般。要不要先随便聊点轻松的？"
      : response;
  }

  if (/今天.*下雨|下雨了|天气/.test(userInput)) {
    return "是啊，天气会挺影响一天的感觉。你那边雨大吗？";
  }

  if (/工作|压力|加班|上班/.test(userInput)) {
    return "听起来最近压力确实不小。是工作量太多，还是一直绷着放不下来？";
  }

  return "我听到了。你刚才说的是这句话本身，我先不多猜；你想从哪儿接着聊？";
}

function readUserInput(messages: ModelMessage[]): string {
  const current = messages.find((message) => message.content.includes("<user_input>"));

  return current?.content.match(/<user_input>\n([\s\S]*?)\n<\/user_input>/)?.[1]?.trim() ?? "";
}

function readHistory(messages: ModelMessage[]): ModelMessage[] {
  const currentInputIndex = messages.findLastIndex((message) =>
    message.content.includes("<user_input>")
  );

  if (currentInputIndex < 0) {
    return [];
  }

  return messages.slice(0, currentInputIndex).filter((message) => message.role !== "system");
}

function readOptionalEnv(
  env: ModelProviderEnvironment,
  key: keyof ModelProviderEnvironment
): string | null {
  const value = env[key];

  return value?.trim() || null;
}
