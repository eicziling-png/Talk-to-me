"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { PartyConversationRequestSchema, PartyStreamEventSchema } from "@/domain/party/schema";
import {
  createPartySession,
  partySessionReducer
} from "@/domain/party/browser-session";
import type {
  PartyConversationRequest,
  PartySession,
  PartyStreamEvent
} from "@/domain/party/types";

import { Composer } from "./composer";
import { PartyTranscript } from "./party-transcript";

export function PartyChatWorkspace() {
  const [session, setSession] = useState<PartySession>(() => createPartySession());
  const [draft, setDraft] = useState("");
  const [safetyMessage, setSafetyMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function submitMessage(messageText = draft, clearDraft = true): Promise<void> {
    const content = messageText.trim();
    if (!content || session.status === "streaming") {
      return;
    }

    const userId = makeId("party-user");
    const history = session.messages
      .filter((message) => message.content.trim().length > 0)
      .flatMap((message): PartyConversationRequest["history"] => {
        if (message.role === "user") {
          return [{ role: "user", content: message.content }];
        }
        return message.expertSlug
          ? [{ role: "expert", expertSlug: message.expertSlug, content: message.content }]
          : [];
      });

    if (clearDraft) {
      setDraft("");
    }
    setSafetyMessage(null);
    setSession((current) => {
      let next = partySessionReducer(current, { type: "status", status: "streaming" });
      next = partySessionReducer(next, {
        type: "user_message",
        id: userId,
        content,
        createdAt: Date.now()
      });
      return next;
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const requestBody: PartyConversationRequest = {
        mode: "self-reflection",
        input: content,
        history
      };
      const parsedBody = PartyConversationRequestSchema.parse(requestBody);
      const response = await fetch("/api/chat/party", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedBody),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error("party_request_failed");
      }

      for await (const event of readPartySseEvents(response)) {
        if (controller.signal.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        applyStreamEvent(event);
        if (event.type === "done") {
          break;
        }
      }

      if (controller.signal.aborted) {
        throw new DOMException("aborted", "AbortError");
      }

      setSession((current) => partySessionReducer(current, { type: "status", status: "idle" }));
    } catch {
      if (abortRef.current !== controller) {
        return;
      }
      if (controller.signal.aborted) {
        setSession((current) => partySessionReducer(current, { type: "interrupted" }));
      } else {
        setSession((current) => partySessionReducer(current, { type: "failed", input: content }));
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }

  function applyStreamEvent(event: PartyStreamEvent): void {
    switch (event.type) {
      case "plan":
        return;
      case "expert_start":
        setSession((current) =>
          partySessionReducer(current, {
            type: "expert_started",
            id: event.id,
            expertSlug: event.expertSlug,
            createdAt: Date.now()
          })
        );
        return;
      case "expert_delta":
        setSession((current) =>
          partySessionReducer(current, {
            type: "expert_chunk",
            id: event.id,
            text: event.text
          })
        );
        return;
      case "expert_done":
        setSession((current) =>
          partySessionReducer(current, { type: "expert_completed", id: event.id })
        );
        return;
      case "safety":
        setSafetyMessage(event.text);
        return;
      case "error":
        throw new Error(event.code);
      case "turn_done":
      case "done":
        return;
    }
  }

  function stopStreaming(): void {
    abortRef.current?.abort();
    setSession((current) => partySessionReducer(current, { type: "interrupted" }));
  }

  function retry(): void {
    if (session.failedInput) {
      void submitMessage(session.failedInput, false);
    }
  }

  function clear(): void {
    abortRef.current?.abort();
    abortRef.current = null;
    setSafetyMessage(null);
    setSession((current) => partySessionReducer(current, { type: "clear" }));
  }

  return (
    <main
      aria-labelledby="party-chat-title"
      className="chat-workspace chat-oil-room oil-room figma-chatpage party-chatpage"
      role="region"
    >
      <img alt="" aria-hidden="true" className="figma-chatpage__art" src="/figma/talk-to-me-homepage.png" />

      <div className="chat-room-panel">
        <div className="chat-room-header">
          <header className="chat-header">
            <Link aria-label="返回首页" className="chat-back-button" href="/">
              <img alt="" aria-hidden="true" src="/figma/chat-chevron-left.svg" />
            </Link>
            <div className="selected-expert-card party-title-card">
              <p id="party-chat-title">
                Let&apos;s party :) <span aria-hidden="true"> | </span> 七位历史心理学家的共同房间
              </p>
            </div>
            <div aria-hidden="true" className="chat-header-spacer" />
            <details className="chat-menu">
              <summary aria-label="群聊菜单">
                <img alt="" aria-hidden="true" src="/figma/chat-more-horizontal.svg" />
              </summary>
              <div className="chat-menu-content">
                <button onClick={clear} type="button">
                  清空
                </button>
              </div>
            </details>
          </header>
        </div>

        <div className="chat-room-conversation">
          <PartyTranscript
            messages={session.messages}
            safetyMessage={safetyMessage}
            status={session.status}
          />
          {session.status === "failed" ? <p role="alert">发送失败，可以点击重试。</p> : null}
          {session.status === "interrupted" ? <p role="alert">消息已中断。</p> : null}
          <div className="retry-row">
            <button disabled={!session.failedInput || session.status === "streaming"} onClick={retry} type="button">
              重试
            </button>
          </div>
        </div>

        <div className="chat-composer-slot">
          <Composer
            disabled={session.status === "streaming"}
            onChange={setDraft}
            onStop={stopStreaming}
            onSubmit={() => void submitMessage()}
            showStop={session.status === "streaming"}
            value={draft}
          />
        </div>
      </div>
    </main>
  );
}

async function* readPartySseEvents(response: Response): AsyncIterable<PartyStreamEvent> {
  if (!response.body) {
    throw new Error("party_response_missing_body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split(/\n\n+/);
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const event = parsePartySseFrame(frame);
      if (event) {
        yield event;
      }
    }
  }

  buffer += decoder.decode();
  const event = parsePartySseFrame(buffer);
  if (event) {
    yield event;
  }
}

function parsePartySseFrame(frame: string): PartyStreamEvent | null {
  const data = frame
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("data:"))
    ?.replace(/^data:\s*/, "");

  if (!data) {
    return null;
  }

  try {
    const parsed = PartyStreamEventSchema.safeParse(JSON.parse(data));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
