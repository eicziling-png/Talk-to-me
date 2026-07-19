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

      for await (const chunk of readSseChunks(response)) {
        if (controller.signal.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        await delay(20);
        if (controller.signal.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        appendAssistantChunk(assistantMessage.id, chunk);
      }

      if (controller.signal.aborted) {
        throw new DOMException("aborted", "AbortError");
      }

      setSession((current) => ({
        ...current,
        status: "idle",
        messages: current.messages.map((message) =>
          message.id === assistantMessage.id ? { ...message, complete: true } : message
        )
      }));
    } catch {
      if (abortRef.current !== controller) {
        return;
      }
      const interrupted = controller.signal.aborted;
      setFailedMessage(content);
      setSession((current) => ({
        ...current,
        status: interrupted ? "interrupted" : "failed",
        messages: current.messages.map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                content: message.content || (interrupted ? "已暂停。" : "发送失败，点重试再试一次。"),
                complete: false
              }
            : message
        )
      }));
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
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
    const activeController = abortRef.current;
    abortRef.current = null;
    activeController?.abort();
    setFailedMessage(null);
    setSession(createBrowserSession({ expertName: expert.nameEn, expertSlug: expert.slug, mode }));
  }

  return (
    <section className="chat-workspace" aria-labelledby="chat-title">
      <header className="chat-header">
        <div className="chat-contact">
          <span className="chat-contact-avatar" aria-hidden="true">
            🧠
          </span>
          <div>
            <p className="eyebrow">正在聊天</p>
            <h1 id="chat-title">{expert.nameEn}</h1>
            <p className="expert-name-zh">
              {expert.nameZh} · {mode}
            </p>
          </div>
        </div>
        <div className="chat-header-actions">
          <ExportButton session={session} />
          <button onClick={clear} type="button">
            清空
          </button>
        </div>
      </header>

      <SessionNotice />
      <Transcript expert={expert} messages={session.messages} />

      {session.status === "failed" ? <p role="alert">发送失败，可以点重试。</p> : null}
      {session.status === "interrupted" ? <p role="alert">消息中断。</p> : null}

      <div className="retry-row">
        <button disabled={!failedMessage || session.status === "streaming"} onClick={retry} type="button">
          重试
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

async function* readSseChunks(response: Response): AsyncIterable<string> {
  if (!response.body) {
    return;
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
      const chunk = parseSseFrame(frame);
      if (chunk) {
        yield chunk;
      }
    }
  }

  buffer += decoder.decode();
  const chunk = parseSseFrame(buffer);
  if (chunk) {
    yield chunk;
  }
}

function parseSseFrame(frame: string): string {
  const event = frame
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("event:"))
    ?.replace(/^event:\s*/, "")
    .trim();

  if (event === "done") {
    return "";
  }

  const data = frame
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("data:"))
    ?.replace(/^data:\s*/, "");

  if (!data) {
    return "";
  }

  try {
    return JSON.parse(data) as string;
  } catch {
    return "";
  }
}

function markLastAssistantIncomplete(messages: BrowserMessage[]): BrowserMessage[] {
  const lastAssistantIndex = messages.findLastIndex((message) => message.role === "assistant");
  if (lastAssistantIndex < 0) {
    return messages;
  }

  return messages.map((message, index) =>
    index === lastAssistantIndex
      ? { ...message, content: message.content || "已暂停。", complete: false }
      : message
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
