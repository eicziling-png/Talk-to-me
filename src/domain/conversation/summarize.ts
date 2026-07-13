import { MAX_HISTORY_MESSAGES } from "./schema";
import type { ChatMessage } from "./types";

export function boundHistory(
  history: readonly ChatMessage[],
  maxMessages = MAX_HISTORY_MESSAGES
): ChatMessage[] {
  return history.slice(Math.max(0, history.length - maxMessages));
}
