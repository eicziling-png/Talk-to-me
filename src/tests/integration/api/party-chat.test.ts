import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PartyConversationRequest, PartyPlan } from "@/domain/party/types";
import { FakeModelProvider } from "@/server/models/fake-provider";
import type { ModelProvider } from "@/server/models/types";
import type { TelemetryEvent } from "@/server/telemetry/event";
import {
  configurePartyChatRouteForTest,
  resetPartyChatRouteForTest
} from "@/server/party/party-route-dependencies";
import { POST } from "@/app/api/chat/party/route";

const safeRequest: PartyConversationRequest = {
  mode: "self-reflection",
  input: "我最近总是在重要时刻退缩，想和你们一起看看这意味着什么。",
  history: []
};

const plan: PartyPlan = {
  participants: [
    { expertSlug: "winnicott", focus: "寻找可以停留的空间", order: 0 },
    { expertSlug: "yalom", focus: "把选择与关系放回当下", order: 1 }
  ],
  messageLimit: 2
};

function makePost(body: unknown): Request {
  return new Request("http://localhost/api/chat/party", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

describe("POST /api/chat/party", () => {
  let events: TelemetryEvent[];

  beforeEach(() => {
    events = [];
    configurePartyChatRouteForTest({
      modelProviderFactory: () => new FakeModelProvider(["这是一次群聊回应。"]),
      planner: async () => plan,
      telemetryLogger: {
        log: vi.fn((event: TelemetryEvent) => {
          events.push(event);
        })
      },
      requestIdFactory: () => "party-req-test",
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
    resetPartyChatRouteForTest();
  });

  it("returns 400 for invalid JSON and schema failures", async () => {
    const invalidJson = await POST(makePost("{"));
    const invalidSchema = await POST(makePost({ ...safeRequest, mode: "theory-classroom" }));

    expect(invalidJson.status).toBe(400);
    await expect(invalidJson.json()).resolves.toMatchObject({ error: { code: "validation_error" } });
    expect(invalidSchema.status).toBe(400);
    await expect(invalidSchema.json()).resolves.toMatchObject({ error: { code: "validation_error" } });
  });

  it("returns 413 for an oversized request body", async () => {
    const response = await POST(makePost({ ...safeRequest, input: "x".repeat(40_000) }));

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "request_too_large" } });
  });

  it("streams only the public plan and expert events", async () => {
    const response = await POST(makePost(safeRequest));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(text).toContain('event: plan');
    expect(text).toContain('"selectedExpertSlugs":["winnicott","yalom"]');
    expect(text).toContain('event: expert_delta');
    expect(text).toContain('event: turn_done');
    expect(text).toContain('event: done');
    expect(text).not.toContain("focus");
    expect(text).not.toContain("reason");
    expect(text).not.toContain("score");
    expect(events).toHaveLength(1);
    expect(JSON.stringify(events[0])).not.toContain(safeRequest.input);
    expect(JSON.stringify(events[0])).not.toContain("这是一次群聊回应");
  });

  it("does not invoke the model factory for S2 or S3 inputs", async () => {
    const factory = vi.fn(() => new FakeModelProvider(["must not run"]));
    configurePartyChatRouteForTest({ modelProviderFactory: factory });

    const response = await POST(
      makePost({ ...safeRequest, input: "I will kill myself tonight and have a plan." })
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain('event: safety');
    expect(text).toContain('event: done');
    expect(text).not.toContain("must not run");
    expect(factory).not.toHaveBeenCalled();
  });

  it("returns stable provider and planner errors", async () => {
    configurePartyChatRouteForTest({
      modelProviderFactory: () => {
        throw new Error("missing provider");
      }
    });
    const unavailable = await POST(makePost(safeRequest));

    expect(unavailable.status).toBe(503);
    await expect(unavailable.json()).resolves.toMatchObject({ error: { code: "provider_unavailable" } });

    configurePartyChatRouteForTest({
      modelProviderFactory: () => new FakeModelProvider(["unused"]),
      planner: async () =>
        ({
          participants: [{ expertSlug: "not-an-expert", focus: "invalid", order: 0 }],
          messageLimit: 1
        }) as unknown as PartyPlan
    });
    const invalidPlan = await POST(makePost(safeRequest));

    expect(invalidPlan.status).toBe(502);
    await expect(invalidPlan.json()).resolves.toMatchObject({
      error: { code: "planner_invalid_output" }
    });
  });

  it("returns a stable timeout error when the stream stalls after the plan", async () => {
    const hangingProvider: ModelProvider = {
      stream: async function* () {
        await new Promise(() => undefined);
        yield { text: "unreached" };
      }
    };
    configurePartyChatRouteForTest({
      modelProviderFactory: () => hangingProvider,
      timeoutMs: 1
    });

    const response = await POST(makePost(safeRequest));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain('event: plan');
    expect(text).toContain('"code":"provider_timeout"');
    expect(text).toContain('event: done');
    expect(events.at(-1)).toMatchObject({ outcome: "provider_timeout" });
  });
});
