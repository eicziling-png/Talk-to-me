import type { ConversationMode } from "./types";
import type { ExpertSlug } from "@/domain/experts/types";
import type { SafetyLevel } from "@/domain/safety/types";

export type BrowserMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  complete?: boolean;
};

export type BrowserSessionStatus = "idle" | "streaming" | "failed" | "interrupted";

export type BrowserSession = {
  expertName: string;
  expertSlug: ExpertSlug;
  mode: ConversationMode;
  messages: BrowserMessage[];
  summary: { content: string } | null;
  status: BrowserSessionStatus;
  safetyLevel: SafetyLevel;
};

export function createBrowserSession(input: {
  expertName: string;
  expertSlug: ExpertSlug;
  mode: ConversationMode;
}): BrowserSession {
  return {
    expertName: input.expertName,
    expertSlug: input.expertSlug,
    mode: input.mode,
    messages: [],
    summary: null,
    status: "idle",
    safetyLevel: "S0"
  };
}
