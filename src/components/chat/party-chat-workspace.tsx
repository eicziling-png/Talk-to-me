"use client";

import Link from "next/link";
import { useState } from "react";

import type { BrowserMessage } from "@/domain/conversation/browser-session";

import { Composer } from "./composer";
import { Transcript } from "./transcript";

export function PartyChatWorkspace() {
  const [messages, setMessages] = useState<BrowserMessage[]>([]);
  const [draft, setDraft] = useState("");

  function submitMessage(): void {
    const content = draft.trim();
    if (!content) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `party-user-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role: "user",
        content,
        createdAt: Date.now()
      }
    ]);
    setDraft("");
  }

  return (
    <main aria-labelledby="party-chat-title" className="chat-workspace chat-oil-room oil-room figma-chatpage party-chatpage" role="region">
      <img alt="" aria-hidden="true" className="figma-chatpage__art" src="/figma/talk-to-me-homepage.png" />

      <div className="chat-room-panel">
        <div className="chat-room-header">
          <header className="chat-header">
            <Link aria-label="返回首页" className="chat-back-button" href="/">
              <img alt="" aria-hidden="true" src="/figma/chat-chevron-left.svg" />
            </Link>
            <div className="selected-expert-card party-title-card">
              <p id="party-chat-title">Let's party :) <span aria-hidden="true"> | </span> 七位历史心理学家的共同房间</p>
            </div>
            <div aria-hidden="true" className="chat-header-spacer" />
            <details className="chat-menu">
              <summary aria-label="群聊菜单">
                <img alt="" aria-hidden="true" src="/figma/chat-more-horizontal.svg" />
              </summary>
              <div className="chat-menu-content">
                <button onClick={() => setMessages([])} type="button">
                  清空
                </button>
              </div>
            </details>
          </header>
        </div>

        <div className="chat-room-conversation">
          <Transcript
            expert={{ nameEn: "Let's party :)", nameZh: "群聊" }}
            messages={messages}
            status="idle"
          />
        </div>

        <div className="chat-composer-slot">
          <Composer
            onChange={setDraft}
            onStop={() => undefined}
            onSubmit={submitMessage}
            showStop={false}
            value={draft}
          />
        </div>
      </div>
    </main>
  );
}
