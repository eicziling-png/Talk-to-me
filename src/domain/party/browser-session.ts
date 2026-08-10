import type { ExpertSlug } from "@/domain/experts/types";

import type {
  PartyBrowserMessage,
  PartyPlan,
  PartySession,
  PartySessionStatus
} from "./types";

export type PartySessionAction =
  | { type: "status"; status: PartySessionStatus }
  | { type: "plan"; plan: PartyPlan }
  | { type: "user_message"; id: string; content: string; createdAt?: number }
  | { type: "expert_started"; id: string; expertSlug: ExpertSlug; createdAt?: number }
  | { type: "expert_chunk"; id: string; text: string }
  | { type: "expert_completed"; id: string }
  | { type: "failed"; input: string }
  | { type: "interrupted" }
  | { type: "clear" };

export function createPartySession(): PartySession {
  return {
    mode: "self-reflection",
    messages: [],
    activePlan: null,
    status: "idle",
    failedInput: null
  };
}

export function partySessionReducer(
  session: PartySession,
  action: PartySessionAction
): PartySession {
  switch (action.type) {
    case "status":
      return { ...session, status: action.status };
    case "plan":
      return { ...session, activePlan: action.plan };
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
