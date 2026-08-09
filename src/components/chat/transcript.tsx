"use client";

import { useEffect, useRef } from "react";

import type { BrowserMessage, BrowserSessionStatus } from "@/domain/conversation/browser-session";

type TranscriptProps = {
  messages: BrowserMessage[];
  status: BrowserSessionStatus;
  expert: {
    nameEn: string;
    nameZh: string;
  };
};

export function Transcript({ expert, messages, status }: TranscriptProps) {
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
  }, [messages]);

  if (messages.length === 0) {
    return <section aria-label="聊天记录" className="chat-transcript" ref={transcriptRef} />;
  }

  return (
    <section aria-label="聊天记录" aria-live="polite" className="chat-transcript" ref={transcriptRef}>
      {messages.map((message) => (
        <article className={`chat-message ${message.role}`} key={message.id}>
          <span className={`message-avatar ${message.role === "user" ? "user-avatar" : "expert-avatar"}`} aria-hidden="true">
            {message.role === "user" ? "我" : isSafetyReply(message.content) ? "!" : expert.nameZh.slice(0, 1)}
          </span>
          <div className="message-stack">
            {message.role === "assistant" ? (
              <p className="message-sender">{isSafetyReply(message.content) ? "安全提醒" : expert.nameZh}</p>
            ) : null}
            <div className="message-bubble">
              <p>{message.content}</p>
              {message.role === "assistant" && message.complete === false && status !== "streaming" ? (
                <p className="incomplete-marker">消息中断，可点击重试继续。</p>
              ) : null}
              {message.role === "assistant" && message.complete === false && status === "streaming" ? (
                <p className="incomplete-marker">{"\u5bf9\u65b9\u8f93\u5165\u4e2d..."}</p>
              ) : null}
            </div>
            <time className="message-time" dateTime={message.createdAt ? new Date(message.createdAt).toISOString() : undefined}>
              {formatMessageTime(message.createdAt)}
            </time>
          </div>
        </article>
      ))}
    </section>
  );
}

function formatMessageTime(timestamp?: number): string {
  const date = timestamp ? new Date(timestamp) : new Date();
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function isSafetyReply(content: string): boolean {
  const normalized = content.toLowerCase();

  return (
    normalized.includes("stepping out of the historical role") ||
    normalized.includes("immediate danger") ||
    normalized.includes("emergency services")
  );
}
