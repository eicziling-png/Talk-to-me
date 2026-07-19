"use client";

import { useEffect, useRef } from "react";

import type { BrowserMessage } from "@/domain/conversation/browser-session";

type TranscriptProps = {
  messages: BrowserMessage[];
  expert: {
    nameEn: string;
    nameZh: string;
  };
};

export function Transcript({ expert, messages }: TranscriptProps) {
  const transcriptRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript) {
      return;
    }

    if (typeof transcript.scrollTo === "function") {
      transcript.scrollTo({
        top: transcript.scrollHeight,
        behavior: "smooth"
      });
      return;
    }

    transcript.scrollTop = transcript.scrollHeight;
  }, [messages]);

  if (messages.length === 0) {
    return (
      <section aria-label="聊天记录" className="chat-transcript" ref={transcriptRef}>
        <p className="empty-transcript">从一句简单的话开始，和 {expert.nameEn} 慢慢说。</p>
      </section>
    );
  }

  return (
    <section aria-label="聊天记录" aria-live="polite" className="chat-transcript" ref={transcriptRef}>
      {messages.map((message) => (
        <article className={`chat-message ${message.role}`} key={message.id}>
          <span className={`message-avatar ${message.role === "user" ? "user-avatar" : "expert-avatar"}`} aria-hidden="true">
            {message.role === "user" ? "我" : isSafetyReply(message.content) ? "!" : "🧠"}
          </span>
          <div className="message-stack">
            {message.role === "assistant" ? (
              <p className="message-sender">{isSafetyReply(message.content) ? "安全提醒" : expert.nameEn}</p>
            ) : null}
            <div className="message-bubble">
              <p>{message.content}</p>
              {message.role === "assistant" && message.complete === false ? (
                <p className="incomplete-marker">消息中断，可点重试继续。</p>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function isSafetyReply(content: string): boolean {
  const normalized = content.toLowerCase();

  return (
    normalized.includes("stepping out of the historical role") ||
    normalized.includes("immediate danger") ||
    normalized.includes("emergency services")
  );
}
