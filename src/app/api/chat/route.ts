import { ConversationRequestSchema } from "@/domain/conversation/schema";
import { getExpert } from "@/domain/experts/registry";
import { assessInput } from "@/domain/safety/classify-input";
import type { ModelProvider } from "@/server/models/types";
import { runChat } from "@/server/orchestration/chat-service";
import {
  getChatRouteDependencies,
  type ChatRouteDependencies
} from "@/server/chat-route/dependencies";
import {
  buildTelemetryEvent,
  estimateAnonymousTokens,
  type TelemetryOutcome
} from "@/server/telemetry/event";
import type { SafetyLevel } from "@/domain/safety/types";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 32_768;
const STREAM_HEADERS = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
  "x-content-type-options": "nosniff"
};

export async function POST(request: Request): Promise<Response> {
  const dependencies = getChatRouteDependencies();
  const requestId = dependencies.requestIdFactory();
  const startedAtMs = dependencies.now();
  let riskLevel: SafetyLevel = "S0";
  let tokenEstimate = 0;

  try {
    const rawBody = await request.text();

    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      await logTelemetry(dependencies, {
        requestId,
        startedAtMs,
        outcome: "validation_error",
        riskLevel,
        anonymousTokenEstimate: tokenEstimate
      });
      return jsonError(413, "request_too_large");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawBody);
    } catch {
      await logTelemetry(dependencies, {
        requestId,
        startedAtMs,
        outcome: "validation_error",
        riskLevel,
        anonymousTokenEstimate: tokenEstimate
      });
      return jsonError(400, "validation_error");
    }

    const parsedRequest = ConversationRequestSchema.safeParse(parsedJson);
    if (!parsedRequest.success) {
      await logTelemetry(dependencies, {
        requestId,
        startedAtMs,
        outcome: "validation_error",
        riskLevel,
        anonymousTokenEstimate: tokenEstimate
      });
      return jsonError(400, "validation_error");
    }

    const conversationRequest = parsedRequest.data;
    const assessment = assessInput(conversationRequest.input);
    riskLevel = assessment.level;
    tokenEstimate = estimateAnonymousTokens(conversationRequest);

    if (!getExpert(conversationRequest.expertSlug)) {
      await logTelemetry(dependencies, {
        requestId,
        startedAtMs,
        outcome: "expert_not_found",
        riskLevel,
        anonymousTokenEstimate: tokenEstimate
      });
      return jsonError(404, "expert_not_found");
    }

    const abortController = new AbortController();
    request.signal.addEventListener("abort", () => abortController.abort(), { once: true });

    const modelProvider = assessment.exitPersona
      ? createUnusedModelProvider()
      : await createModelProviderOrResponse({
          dependencies,
          requestId,
          startedAtMs,
          riskLevel,
          tokenEstimate
        });

    if (modelProvider instanceof Response) {
      return modelProvider;
    }

    const chatStream = runChat(conversationRequest, {
      modelProvider,
      knowledgeProvider: dependencies.knowledgeProvider,
      signal: abortController.signal
    });
    const iterator = chatStream[Symbol.asyncIterator]();
    const first = await nextWithTimeout(iterator, dependencies.timeoutMs, abortController);

    if (first === "timeout") {
      await logTelemetry(dependencies, {
        requestId,
        startedAtMs,
        outcome: "provider_timeout",
        riskLevel,
        anonymousTokenEstimate: tokenEstimate
      });
      return jsonError(503, "provider_timeout");
    }

    return streamResponse({
      first,
      iterator,
      dependencies,
      requestId,
      startedAtMs,
      riskLevel,
      tokenEstimate
    });
  } catch {
    await logTelemetry(dependencies, {
      requestId,
      startedAtMs,
      outcome: "internal_error",
      riskLevel,
      anonymousTokenEstimate: tokenEstimate
    });
    return jsonError(500, "internal_error");
  }
}

async function createModelProviderOrResponse(input: {
  dependencies: ChatRouteDependencies;
  requestId: string;
  startedAtMs: number;
  riskLevel: SafetyLevel;
  tokenEstimate: number;
}): Promise<ModelProvider | Response> {
  try {
    return input.dependencies.modelProviderFactory();
  } catch {
    await logTelemetry(input.dependencies, {
      requestId: input.requestId,
      startedAtMs: input.startedAtMs,
      outcome: "provider_unavailable",
      riskLevel: input.riskLevel,
      anonymousTokenEstimate: input.tokenEstimate
    });
    return jsonError(503, "provider_unavailable");
  }
}

function createUnusedModelProvider(): ModelProvider {
  return {
    stream: async function* () {
      throw new Error("Safety-exit responses must not invoke the model provider.");
    }
  };
}

async function nextWithTimeout(
  iterator: AsyncIterator<string>,
  timeoutMs: number,
  abortController: AbortController
): Promise<IteratorResult<string> | "timeout"> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<"timeout">((resolve) => {
    timeoutId = setTimeout(() => {
      abortController.abort();
      resolve("timeout");
    }, timeoutMs);
  });

  try {
    return await Promise.race([iterator.next(), timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function streamResponse(input: {
  first: IteratorResult<string>;
  iterator: AsyncIterator<string>;
  dependencies: ChatRouteDependencies;
  requestId: string;
  startedAtMs: number;
  riskLevel: SafetyLevel;
  tokenEstimate: number;
}): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!input.first.done) {
          controller.enqueue(encoder.encode(formatSseData(input.first.value)));
        }

        while (true) {
          const next = await input.iterator.next();
          if (next.done) {
            break;
          }
          controller.enqueue(encoder.encode(formatSseData(next.value)));
        }

        controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
        controller.close();

        await logTelemetry(input.dependencies, {
          requestId: input.requestId,
          startedAtMs: input.startedAtMs,
          outcome: "streamed",
          riskLevel: input.riskLevel,
          anonymousTokenEstimate: input.tokenEstimate
        });
      } catch {
        controller.error(new Error("stream_failed"));
        await logTelemetry(input.dependencies, {
          requestId: input.requestId,
          startedAtMs: input.startedAtMs,
          outcome: "internal_error",
          riskLevel: input.riskLevel,
          anonymousTokenEstimate: input.tokenEstimate
        });
      }
    }
  });

  return new Response(stream, { status: 200, headers: STREAM_HEADERS });
}

function formatSseData(text: string): string {
  return `data: ${JSON.stringify(text)}\n\n`;
}

function jsonError(status: number, code: string): Response {
  return Response.json({ error: { code } }, { status });
}

async function logTelemetry(
  dependencies: ChatRouteDependencies,
  input: {
    requestId: string;
    startedAtMs: number;
    outcome: TelemetryOutcome;
    riskLevel: SafetyLevel;
    anonymousTokenEstimate: number;
  }
): Promise<void> {
  await dependencies.telemetryLogger.log(
    buildTelemetryEvent({
      ...input,
      endedAtMs: dependencies.now()
    })
  );
}
