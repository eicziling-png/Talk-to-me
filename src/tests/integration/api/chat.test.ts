import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ConversationRequest } from "@/domain/conversation/types";
import { NullKnowledgeProvider } from "@/server/knowledge/null-provider";
import { FakeModelProvider } from "@/server/models/fake-provider";
import type { ModelProvider } from "@/server/models/types";
import type { TelemetryEvent } from "@/server/telemetry/event";
import {
  configureChatRouteForTest,
  resetChatRouteForTest
} from "@/server/chat-route/dependencies";
import {
  POST
} from "@/app/api/chat/route";

const safeRequest: ConversationRequest = {
  expertSlug: "freud",
  mode: "theory-classroom",
  input: "Explain repression as an educational concept.",
  history: []
};

function makePost(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

async function readText(response: Response): Promise<string> {
  return response.text();
}

describe("POST /api/chat", () => {
  let events: TelemetryEvent[];

  beforeEach(() => {
    events = [];
    configureChatRouteForTest({
      modelProviderFactory: () => new FakeModelProvider(["Hello", " world"]),
      knowledgeProvider: new NullKnowledgeProvider(),
      telemetryLogger: {
        log: vi.fn((event: TelemetryEvent) => {
          events.push(event);
        })
      },
      requestIdFactory: () => "req-test",
      now: (() => {
        let current = 1_000;
        return () => {
          current += 25;
          return current;
        };
      })(),
      timeoutMs: 50
    });
  });

  afterEach(() => {
    resetChatRouteForTest();
  });

  it("returns 400 with a stable code for invalid requests", async () => {
    const response = await POST(makePost({ ...safeRequest, mode: "invalid-mode" }));

    await expect(response.json()).resolves.toMatchObject({
      error: { code: "validation_error" }
    });
    expect(response.status).toBe(400);
  });

  it("returns 404 with a stable code for unknown experts", async () => {
    const response = await POST(makePost({ ...safeRequest, expertSlug: "unknown" }));

    await expect(response.json()).resolves.toMatchObject({
      error: { code: "expert_not_found" }
    });
    expect(response.status).toBe(404);
  });

  it("streams safe responses with event-stream headers", async () => {
    const response = await POST(makePost(safeRequest));
    const text = await readText(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(text).toContain('data: "Hello"');
    expect(text).toContain('data: " world"');
  });

  it("streams S3 persona-exit responses without historical persona labels", async () => {
    const stream = vi.fn(async function* () {
      yield { text: "Jung persona output should not run" };
    });
    configureChatRouteForTest({
      modelProviderFactory: () => ({ stream })
    });

    const response = await POST(
      makePost({
        ...safeRequest,
        expertSlug: "jung",
        input: "I will kill myself tonight and have a plan."
      })
    );
    const text = await readText(response);

    expect(response.status).toBe(200);
    expect(text).not.toContain("Jung");
    expect(text).not.toContain("Freud");
    expect(stream).not.toHaveBeenCalled();
    expect(events.at(-1)).toMatchObject({ riskLevel: "S3", outcome: "streamed" });
  });

  it("does not require configured model credentials for S3 persona-exit responses", async () => {
    resetChatRouteForTest();
    configureChatRouteForTest({
      knowledgeProvider: new NullKnowledgeProvider(),
      telemetryLogger: {
        log: vi.fn((event: TelemetryEvent) => {
          events.push(event);
        })
      },
      requestIdFactory: () => "req-s3-no-model",
      now: () => 2_000,
      timeoutMs: 50
    });

    const response = await POST(
      makePost({
        ...safeRequest,
        input: "I will kill myself tonight and have a plan."
      })
    );

    expect(response.status).toBe(200);
    await expect(readText(response)).resolves.toContain("data:");
    expect(events.at(-1)).toMatchObject({ riskLevel: "S3", outcome: "streamed" });
  });

  it("streams an honest configuration notice when model credentials are absent", async () => {
    resetChatRouteForTest();
    configureChatRouteForTest({
      knowledgeProvider: new NullKnowledgeProvider(),
      telemetryLogger: {
        log: vi.fn((event: TelemetryEvent) => {
          events.push(event);
        })
      },
      requestIdFactory: () => "req-fallback-model",
      now: () => 3_000,
      timeoutMs: 50
    });

    const response = await POST(
      makePost({
        ...safeRequest,
        expertSlug: "winnicott",
        mode: "self-reflection",
        input: "你好"
      })
    );
    const text = await readText(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(text).toContain("还没有连接真实对话模型");
    expect(text).toContain("MODEL_PROVIDER");
    expect(text).toContain("MODEL_API_KEY");
    expect(text).toContain("MODEL_NAME");
    expect(text).not.toContain("我听到了");
    expect(text).not.toContain("听起来");
    expect(text).not.toContain("难过");
    expect(text).not.toContain("振作一点");
    expect(text).not.toContain("努力地适应别人");
    expect(text).toContain("data:");
    expect(text).toContain("event: done");
    expect(events.at(-1)).toMatchObject({ riskLevel: "S0", outcome: "streamed" });
  });

  it("returns 413 when the request body exceeds the route size limit", async () => {
    const response = await POST(makePost({ ...safeRequest, input: "x".repeat(40_000) }));

    await expect(response.json()).resolves.toMatchObject({
      error: { code: "request_too_large" }
    });
    expect(response.status).toBe(413);
  });

  it("returns 503 with a stable code when the provider times out before streaming", async () => {
    const hangingProvider: ModelProvider = {
      stream: async function* (_messages, signal) {
        await new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError"))
          );
        });
        yield { text: "unreached" };
      }
    };

    configureChatRouteForTest({
      modelProviderFactory: () => hangingProvider,
      timeoutMs: 1
    });

    const response = await POST(makePost(safeRequest));

    await expect(response.json()).resolves.toMatchObject({
      error: { code: "provider_timeout" }
    });
    expect(response.status).toBe(503);
  });

  it("logs only allowlisted telemetry fields without message content", async () => {
    const response = await POST(
      makePost({
        ...safeRequest,
        input: "Please discuss my private childhood dream about a red door."
      })
    );

    await readText(response);

    expect(events).toHaveLength(1);
    expect(Object.keys(events[0]).sort()).toEqual([
      "anonymousTokenEstimate",
      "durationMs",
      "outcome",
      "requestId",
      "riskLevel"
    ]);

    const serialized = JSON.stringify(events[0]);
    expect(serialized).not.toContain("red door");
    expect(serialized).not.toContain("private childhood dream");
    expect(serialized).not.toContain("Hello world");
  });
});
