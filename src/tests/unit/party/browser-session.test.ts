import { describe, expect, it } from "vitest";

import {
  createPartySession,
  partySessionReducer
} from "@/domain/party/browser-session";

describe("party browser session", () => {
  it("starts as an empty ephemeral self-reflection session", () => {
    expect(createPartySession(123)).toEqual({
      mode: "self-reflection",
      messages: [],
      status: "idle",
      failedInput: null,
      sessionSeed: 123
    });
  });

  it("keeps expert identity while appending streamed content", () => {
    const initial = createPartySession();
    const withExpert = partySessionReducer(initial, {
      type: "expert_started",
      id: "expert-1",
      expertSlug: "winnicott"
    });
    const withChunk = partySessionReducer(withExpert, {
      type: "expert_chunk",
      id: "expert-1",
      text: "我会先陪你停在这里。"
    });

    expect(withChunk.messages).toEqual([
      {
        id: "expert-1",
        role: "expert",
        expertSlug: "winnicott",
        content: "我会先陪你停在这里。",
        complete: false
      }
    ]);
  });

  it("marks interrupted work and clear returns to a fresh session", () => {
    const initial = createPartySession();
    const streaming = partySessionReducer(initial, { type: "status", status: "streaming" });
    const interrupted = partySessionReducer(streaming, { type: "interrupted" });
    const cleared = partySessionReducer(interrupted, { type: "clear" });

    expect(interrupted.status).toBe("interrupted");
    expect(cleared.mode).toBe("self-reflection");
    expect(cleared.messages).toEqual([]);
    expect(cleared.status).toBe("idle");
    expect(cleared.failedInput).toBeNull();
    expect(cleared.sessionSeed).toEqual(expect.any(Number));
    expect(cleared.sessionSeed).not.toBe(initial.sessionSeed);
  });

  it("stores the failed input without persisting anything outside memory", () => {
    const session = partySessionReducer(createPartySession(), {
      type: "failed",
      input: "请再试一次"
    });

    expect(session.status).toBe("failed");
    expect(session.failedInput).toBe("请再试一次");
  });
});
