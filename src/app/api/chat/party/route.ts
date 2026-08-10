import { ZodError } from "zod";

import { PartyConversationRequestSchema } from "@/domain/party/schema";
import { assessInput } from "@/domain/safety/classify-input";
import type { PartyConversationRequest, PartyStreamEvent } from "@/domain/party/types";
import type { ModelProvider } from "@/server/models/types";
import { runPartyChat } from "@/server/party/party-chat-service";
import {
  getPartyRouteDependencies,
  type PartyRouteDependencies
} from "@/server/party/party-route-dependencies";
import {
  buildTelemetryEvent,
  type TelemetryOutcome,
  type TelemetryEvent
} from "@/server/telemetry/event";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 32_768;
const STREAM_HEADERS = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
  "x-content-type-options": "nosniff"
};

export async function POST(request: Request): Promise<Response> {
  const dependencies = getPartyRouteDependencies();
  const requestId = dependencies.requestIdFactory();
  const startedAtMs = dependencies.now();
  let riskLevel: TelemetryEvent["riskLevel"] = "S0";
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

    const parsedRequest = PartyConversationRequestSchema.safeParse(parsedJson);
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

    const partyRequest = parsedRequest.data;
    const assessment = assessInput(partyRequest.input);
    riskLevel = assessment.level;
    tokenEstimate = estimateAnonymousPartyTokens(partyRequest);

    const abortController = new AbortController();
    request.signal.addEventListener("abort", () => abortController.abort(), { once: true });

    const modelProvider = assessment.exitPersona
      ? createUnusedModelProvider()
      : await createModelProviderOrResponse(dependencies, {
          requestId,
          startedAtMs,
          riskLevel,
          tokenEstimate
        });

    if (modelProvider instanceof Response) {
      return modelProvider;
    }

    const chatStream = runPartyChat(partyRequest, {
      modelProvider,
      planner: dependencies.planner,
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
      tokenEstimate,
      abortController
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(502, "planner_invalid_output");
    }

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

async function createModelProviderOrResponse(
  dependencies: PartyRouteDependencies,
  telemetryInput: {
    requestId: string;
    startedAtMs: number;
    riskLevel: TelemetryEvent["riskLevel"];
    tokenEstimate: number;
  }
): Promise<ModelProvider | Response> {
  try {
    return dependencies.modelProviderFactory();
  } catch {
    await logTelemetry(dependencies, {
      requestId: telemetryInput.requestId,
      startedAtMs: telemetryInput.startedAtMs,
      outcome: "provider_unavailable",
      riskLevel: telemetryInput.riskLevel,
      anonymousTokenEstimate: telemetryInput.tokenEstimate
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
  iterator: AsyncIterator<PartyStreamEvent>,
  timeoutMs: number,
  abortController: AbortController
): Promise<IteratorResult<PartyStreamEvent> | "timeout"> {
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
  first: IteratorResult<PartyStreamEvent>;
  iterator: AsyncIterator<PartyStreamEvent>;
  dependencies: PartyRouteDependencies;
  requestId: string;
  startedAtMs: number;
  riskLevel: TelemetryEvent["riskLevel"];
  tokenEstimate: number;
  abortController: AbortController;
}): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!input.first.done) {
          controller.enqueue(encoder.encode(formatSseEvent(input.first.value)));
        }

        while (true) {
          const next = await nextWithTimeout(
            input.iterator,
            input.dependencies.timeoutMs,
            input.abortController
          );
          if (next === "timeout") {
            controller.enqueue(
              encoder.encode(formatSseEvent({ type: "error", code: "provider_timeout" }))
            );
            controller.enqueue(encoder.encode(formatSseEvent({ type: "done" })));
            controller.close();
            await logTelemetry(input.dependencies, {
              requestId: input.requestId,
              startedAtMs: input.startedAtMs,
              outcome: "provider_timeout",
              riskLevel: input.riskLevel,
              anonymousTokenEstimate: input.tokenEstimate
            });
            return;
          }
          if (next.done) {
            break;
          }
          controller.enqueue(encoder.encode(formatSseEvent(next.value)));
        }

        controller.close();
        await logTelemetry(input.dependencies, {
          requestId: input.requestId,
          startedAtMs: input.startedAtMs,
          outcome: "streamed",
          riskLevel: input.riskLevel,
          anonymousTokenEstimate: input.tokenEstimate
        });
      } catch (error) {
        if (error instanceof ZodError) {
          controller.enqueue(
            encoder.encode(formatSseEvent({ type: "error", code: "planner_invalid_output" }))
          );
          controller.enqueue(encoder.encode(formatSseEvent({ type: "done" })));
          controller.close();
          await logTelemetry(input.dependencies, {
            requestId: input.requestId,
            startedAtMs: input.startedAtMs,
            outcome: "internal_error",
            riskLevel: input.riskLevel,
            anonymousTokenEstimate: input.tokenEstimate
          });
          return;
        }

        controller.error(new Error("party_stream_failed"));
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

function formatSseEvent(event: PartyStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

function jsonError(status: number, code: string): Response {
  return Response.json({ error: { code } }, { status });
}

async function logTelemetry(
  dependencies: PartyRouteDependencies,
  input: {
    requestId: string;
    startedAtMs: number;
    outcome: TelemetryOutcome;
    riskLevel: TelemetryEvent["riskLevel"];
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

function estimateAnonymousPartyTokens(request: PartyConversationRequest): number {
  const historyChars = request.history.reduce(
    (total, message) => total + message.content.length,
    0
  );
  const summaryChars = request.summary?.content.length ?? 0;
  return Math.ceil((request.input.length + historyChars + summaryChars) / 4);
}
