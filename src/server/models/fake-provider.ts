import type { ModelMessage } from "@/server/orchestration/build-messages";

import {
  mapModelProviderError,
  ModelProviderError,
  type ModelChunk,
  type ModelProvider
} from "./types";

export type FakeModelProviderOptions = {
  failAtChunkIndex?: number;
};

export class FakeModelProvider implements ModelProvider {
  private readonly chunks: readonly string[];
  private readonly failAtChunkIndex?: number;

  constructor(chunks: readonly string[] = [], options: FakeModelProviderOptions = {}) {
    this.chunks = chunks;
    this.failAtChunkIndex = options.failAtChunkIndex;
  }

  async *stream(
    _messages: ModelMessage[],
    signal?: AbortSignal
  ): AsyncIterable<ModelChunk> {
    for (let index = 0; index < this.chunks.length; index += 1) {
      throwIfAborted(signal);

      if (this.failAtChunkIndex === index) {
        throw mapModelProviderError(new Error("fake provider failure"));
      }

      yield { text: this.chunks[index] };
    }

    throwIfAborted(signal);
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new ModelProviderError("provider_aborted", "Model generation was aborted.");
  }
}
