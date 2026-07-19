export type ConversationMode = "self-reflection" | "theory-classroom" | "critical-discussion";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type SessionSummary = {
  content: string;
};

export type ConversationRequest = {
  expertSlug: string;
  mode: ConversationMode;
  input: string;
  history: ChatMessage[];
  summary?: SessionSummary;
  debug?: boolean;
};
