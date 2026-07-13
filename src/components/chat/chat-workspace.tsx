"use client";

import { useMemo, useRef, useState } from "react";

import {
  createBrowserSession,
  type BrowserMessage,
  type BrowserSession
} from "@/domain/conversation/browser-session";
import type { ConversationMode } from "@/domain/conversation/types";
import type { ExpertSlug } from "@/domain/experts/types";

import { Composer } from "./composer";
import { ExportButton } from "./export-button";
import { SessionNotice } from "./session-notice";
import { Transcript } from "./transcript";

type ChatWorkspaceProps = {
  expert: {
    slug: ExpertSlug;
    nameEn: string;
    nameZh: string;
  };
  mode: ConversationMode;
};

export function ChatWorkspace({ expert, mode }: ChatWorkspaceProps) {
  const initialSession = useMemo(
    () =>
      createBrowserSession({
        expertName: expert.nameEn,
        expertSlug: expert.slug,
        mode
      }),
    [expert.nameEn, expert.slug, mode]
  );
  const [session, setSession] = useState<BrowserSession>(initialSession);
  const [draft, setDraft] = useState("");
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function submitMessage(messageText = draft, clearDraft = true): Promise<void> {
    const content = messageText.trim();
    if (!content || session.status === "streaming") {
      return;
    }

    const userMessage = makeMessage("user", content);
    const assistantMessage = makeMessage("assistant", "", false);
    if (clearDraft) {
      setDraft("");
    }
    setFailedMessage(null);
    setSession((current) => ({
      ...current,
      status: "streaming",
      messages: [...current.messages, userMessage, assistantMessage]
    }));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expertSlug: expert.slug,
          mode,
          input: content,
          history: session.messages
            .filter((message) => message.content.trim().length > 0)
            .map((message) => ({ role: message.role, content: message.content }))
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const text = await response.text();
      const chunks = parseSseText(text);

      for (const chunk of chunks) {
        if (controller.signal.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        await delay(20);
        appendAssistantChunk(assistantMessage.id, chunk);
      }

      setSession((current) => ({
        ...current,
        status: "idle",
        messages: current.messages.map((message) =>
          message.id === assistantMessage.id ? { ...message, complete: true } : message
        )
      }));
    } catch {
      const interrupted = controller.signal.aborted;
      setFailedMessage(content);
      setSession((current) => ({
        ...current,
        status: interrupted ? "interrupted" : "failed",
        messages: current.messages.map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                content: message.content || (interrupted ? "Interrupted." : "Request did not complete."),
                complete: false
              }
            : message
        )
      }));
    } finally {
      abortRef.current = null;
    }
  }

  function appendAssistantChunk(id: string, chunk: string): void {
    setSession((current) => ({
      ...current,
      messages: current.messages.map((message) =>
        message.id === id ? { ...message, content: `${message.content}${chunk}` } : message
      )
    }));
  }

  function stopStreaming(): void {
    abortRef.current?.abort();
    setSession((current) => ({
      ...current,
      status: "interrupted",
      messages: markLastAssistantIncomplete(current.messages)
    }));
  }

  function retry(): void {
    if (failedMessage) {
      void submitMessage(failedMessage, false);
    }
  }

  function clear(): void {
    abortRef.current?.abort();
    setFailedMessage(null);
    setSession(createBrowserSession({ expertName: expert.nameEn, expertSlug: expert.slug, mode }));
  }

  return (
    <section className="chat-workspace" aria-labelledby="chat-title">
      <header className="chat-header">
        <div>
          <p className="eyebrow">{mode}</p>
          <h1 id="chat-title">Chat with {expert.nameEn}</h1>
          <p className="expert-name-zh">{expert.nameZh}</p>
        </div>
        <button onClick={clear} type="button">
          Clear
        </button>
      </header>

      <SessionNotice />
      <Transcript messages={session.messages} />

      {session.status === "failed" ? <p role="alert">Reply failed. You can retry.</p> : null}
      {session.status === "interrupted" ? <p role="alert">Response interrupted.</p> : null}

      <div className="retry-row">
        <button disabled={!failedMessage || session.status === "streaming"} onClick={retry} type="button">
          Retry
        </button>
      </div>

      <Composer
        disabled={session.status === "streaming"}
        onChange={setDraft}
        onStop={stopStreaming}
        onSubmit={() => void submitMessage()}
        showStop={session.status === "streaming"}
        value={draft}
      />
      <ExportButton session={session} />
    </section>
  );
}

function makeMessage(role: BrowserMessage["role"], content: string, complete?: boolean): BrowserMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    complete
  };
}

function parseSseText(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((frame) => frame.trim())
    .filter((frame) => frame.startsWith("data:"))
    .map((frame) => frame.replace(/^data:\s*/, ""))
    .map((data) => {
      try {
        return JSON.parse(data) as string;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

function markLastAssistantIncomplete(messages: BrowserMessage[]): BrowserMessage[] {
  const lastAssistantIndex = messages.findLastIndex((message) => message.role === "assistant");
  if (lastAssistantIndex < 0) {
    return messages;
  }

  return messages.map((message, index) =>
    index === lastAssistantIndex
      ? { ...message, content: message.content || "Interrupted.", complete: false }
      : message
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
