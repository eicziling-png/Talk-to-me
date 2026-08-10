"use client";

import { useEffect, useRef } from "react";

import { getExpert } from "@/domain/experts/registry";
import type { PartyBrowserMessage, PartySessionStatus } from "@/domain/party/types";

type PartyTranscriptProps = {
  messages: PartyBrowserMessage[];
  status: PartySessionStatus;
  safetyMessage?: string | null;
};

export function PartyTranscript({ messages, safetyMessage, status }: PartyTranscriptProps) {
  const transcriptRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript) {
      return;
    }

    const scrollContainer = transcript.closest<HTMLElement>(".chat-room-conversation") ?? transcript;
    if (typeof scrollContainer.scrollTo === "function") {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "smooth"
      });
      return;
    }

    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }, [messages, safetyMessage]);

  return (
    <section
      aria-label="聊天记录"
      aria-live="polite"
      className="chat-transcript party-transcript"
      ref={transcriptRef}
    >
      {messages.map((message) => (
        <PartyMessage key={message.id} message={message} status={status} />
      ))}
      {safetyMessage ? (
        <article className="party-message party-message--safety" data-role="safety">
          <div className="party-message-stack">
            <p className="party-message-name">安全提醒</p>
            <div className="party-message-body">
              <p>{safetyMessage}</p>
            </div>
            <time className="party-message-time" dateTime={new Date().toISOString()}>
              {formatMessageTime()}
            </time>
          </div>
        </article>
      ) : null}
    </section>
  );
}

function PartyMessage({ message, status }: { message: PartyBrowserMessage; status: PartySessionStatus }) {
  if (message.role === "user") {
    return (
      <article className="party-message party-message--user" data-role="user">
        <div className="party-message-stack">
          <p className="party-message-name">我</p>
          <div className="party-message-body">
            <p>{message.content}</p>
          </div>
          <time className="party-message-time" dateTime={toDateTime(message.createdAt)}>
            {formatMessageTime(message.createdAt)}
          </time>
        </div>
      </article>
    );
  }

  const expert = message.expertSlug ? getExpert(message.expertSlug) : null;
  const expertSlug = message.expertSlug ?? "unknown";
  const expertName = expert?.nameZh ?? "群聊中的一位专家";
  const incomplete = message.complete === false;

  return (
    <article
      className={`party-message party-message--expert party-message--${expertSlug}`}
      data-expert={expertSlug}
      data-role="expert"
    >
      <span aria-hidden="true" className={`party-marker party-marker--${expertSlug}`} />
      <div className="party-message-stack">
        <p className="party-message-name">{expertName}</p>
        <div className="party-message-body">
          <p>{message.content}</p>
          {incomplete && status === "streaming" ? <p className="party-message-status">对方输入中...</p> : null}
          {incomplete && status !== "streaming" ? <p className="party-message-status">消息已中断。</p> : null}
        </div>
        <time className="party-message-time" dateTime={toDateTime(message.createdAt)}>
          {formatMessageTime(message.createdAt)}
        </time>
      </div>
    </article>
  );
}

function toDateTime(timestamp?: number): string | undefined {
  return timestamp ? new Date(timestamp).toISOString() : undefined;
}

function formatMessageTime(timestamp?: number): string {
  const date = timestamp ? new Date(timestamp) : new Date();
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}
