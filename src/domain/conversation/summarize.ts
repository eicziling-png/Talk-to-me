import { MAX_CONTEXT_HISTORY_MESSAGES } from "./schema";
import type { ChatMessage } from "./types";

export function boundHistory(
  history: readonly ChatMessage[],
  maxMessages = MAX_CONTEXT_HISTORY_MESSAGES
): ChatMessage[] {
  return history.slice(Math.max(0, history.length - maxMessages));
}

export type CompressedHistoryContext = {
  compressedSummary: string | null;
  recentHistory: ChatMessage[];
};

export function compressHistoryContext(
  history: readonly ChatMessage[],
  maxRecentMessages = MAX_CONTEXT_HISTORY_MESSAGES
): CompressedHistoryContext {
  const recentHistory = boundHistory(history, maxRecentMessages);
  const olderHistory = history.slice(0, Math.max(0, history.length - recentHistory.length));

  if (olderHistory.length === 0) {
    return { compressedSummary: null, recentHistory };
  }

  const first = olderHistory[0];
  const last = olderHistory.at(-1);
  const firstText = first ? summarizeMessage(first) : "";
  const lastText = last && last !== first ? summarizeMessage(last) : "";

  return {
    compressedSummary: [
      `Older conversation compressed from ${olderHistory.length} messages.`,
      firstText ? `First older note: ${firstText}` : "",
      lastText ? `Latest older note before recent window: ${lastText}` : ""
    ]
      .filter(Boolean)
      .join("\n"),
    recentHistory
  };
}

function summarizeMessage(message: ChatMessage): string {
  const text = message.content.replace(/\s+/g, " ").trim();
  const snippet = text.length > 120 ? `${text.slice(0, 120)}…` : text;

  return `${message.role}: ${snippet}`;
}
