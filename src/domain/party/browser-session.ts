import type { ExpertSlug } from "@/domain/experts/types";

import type {
  PartyBrowserMessage,
  PartySession,
  PartySessionStatus
} from "./types";

export type PartySessionAction =
  | { type: "status"; status: PartySessionStatus }
  | { type: "user_message"; id: string; content: string; createdAt?: number }
  | { type: "expert_started"; id: string; expertSlug: ExpertSlug; createdAt?: number }
  | { type: "expert_chunk"; id: string; text: string }
  | { type: "expert_completed"; id: string }
  | { type: "failed"; input: string }
  | { type: "interrupted" }
  | { type: "clear" };

export function createPartySession(sessionSeed = createPartySessionSeed()): PartySession {
  return {
    mode: "self-reflection",
    messages: [],
    status: "idle",
    failedInput: null,
    sessionSeed
  };
}

function createPartySessionSeed(): number {
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] ?? 0;
  }

  return Math.floor(Math.random() * 4_294_967_296);
}

export function partySessionReducer(
  session: PartySession,
  action: PartySessionAction
): PartySession {
  switch (action.type) {
    case "status":
      return { ...session, status: action.status };
    case "user_message":
      return {
        ...session,
        messages: [
          ...session.messages,
          {
            id: action.id,
            role: "user",
            content: action.content,
            complete: true,
            ...(action.createdAt === undefined ? {} : { createdAt: action.createdAt })
          }
        ]
      };
    case "expert_started":
      return {
        ...session,
        messages: [
          ...session.messages,
          {
            id: action.id,
            role: "expert",
            expertSlug: action.expertSlug,
            content: "",
            complete: false,
            ...(action.createdAt === undefined ? {} : { createdAt: action.createdAt })
          }
        ]
      };
    case "expert_chunk":
      return updateMessage(session, action.id, (message) => ({
        ...message,
        content: `${message.content}${action.text}`
      }));
    case "expert_completed":
      return updateMessage(session, action.id, (message) => ({ ...message, complete: true }));
    case "failed":
      return { ...session, status: "failed", failedInput: action.input };
    case "interrupted":
      return {
        ...session,
        status: "interrupted",
        messages: session.messages.map((message) =>
          message.role === "expert" && !message.complete
            ? { ...message, content: message.content || "已暂停。", complete: false }
            : message
        )
      };
    case "clear":
      return createPartySession();
  }
}

function updateMessage(
  session: PartySession,
  id: string,
  update: (message: PartyBrowserMessage) => PartyBrowserMessage
): PartySession {
  return {
    ...session,
    messages: session.messages.map((message) => (message.id === id ? update(message) : message))
  };
}
