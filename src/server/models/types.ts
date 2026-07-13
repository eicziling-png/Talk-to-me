import type { ModelMessage } from "@/server/orchestration/build-messages";

export type ModelChunk = {
  text: string;
};

export type ModelProvider = {
  stream(messages: ModelMessage[], signal?: AbortSignal): AsyncIterable<ModelChunk>;
};

export type ModelProviderErrorCode =
  | "provider_aborted"
  | "provider_failed"
  | "provider_unavailable";

export class ModelProviderError extends Error {
  readonly code: ModelProviderErrorCode;

  constructor(code: ModelProviderErrorCode, message: string) {
    super(message);
    this.name = "ModelProviderError";
    this.code = code;
  }
}

export function mapModelProviderError(error: unknown): ModelProviderError {
  if (error instanceof ModelProviderError) {
    return error;
  }

  if (isAbortError(error)) {
    return new ModelProviderError("provider_aborted", "Model generation was aborted.");
  }

  return new ModelProviderError("provider_failed", "Model provider failed to generate a response.");
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }

  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}
