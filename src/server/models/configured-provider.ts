import type { ModelMessage } from "@/server/orchestration/build-messages";

import {
  ModelProviderError,
  type ModelChunk,
  type ModelProvider
} from "./types";

export type ModelProviderEnvironment = {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
} & Record<string, string | undefined>;

export function createConfiguredModelProvider(
  env: ModelProviderEnvironment = process.env
): ModelProvider {
  const apiKey = readRequiredEnv(env, "OPENAI_API_KEY");
  const model = readRequiredEnv(env, "OPENAI_MODEL");

  return new ConfiguredModelProvider(apiKey, model);
}

class ConfiguredModelProvider implements ModelProvider {
  readonly #apiKey: string;
  readonly #model: string;

  constructor(apiKey: string, model: string) {
    this.#apiKey = apiKey;
    this.#model = model;
  }

  async *stream(
    _messages: ModelMessage[],
    _signal?: AbortSignal
  ): AsyncIterable<ModelChunk> {
    void this.#apiKey;
    void this.#model;

    throw new ModelProviderError(
      "provider_unavailable",
      "Configured model provider adapter is not implemented in this MVP."
    );
  }
}

function readRequiredEnv(
  env: ModelProviderEnvironment,
  key: keyof ModelProviderEnvironment
): string {
  const value = env[key];

  if (!value?.trim()) {
    throw new ModelProviderError("provider_unavailable", `${key} is required.`);
  }

  return value;
}
