import { z } from "zod";

export const CONVERSATION_MODES = [
  "self-reflection",
  "theory-classroom",
  "critical-discussion"
] as const;

export const MAX_CURRENT_INPUT_CHARS = 4_000;
export const MAX_HISTORY_MESSAGES = 12;
export const MAX_HISTORY_MESSAGE_CHARS = 4_000;
export const MAX_SUMMARY_CHARS = 2_000;

export const ConversationModeSchema = z.enum(CONVERSATION_MODES);

export const ChatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(MAX_HISTORY_MESSAGE_CHARS)
  })
  .strict();

export const SessionSummarySchema = z
  .object({
    content: z.string().trim().min(1).max(MAX_SUMMARY_CHARS)
  })
  .strict();

export const ConversationRequestSchema = z
  .object({
    expertSlug: z.string().trim().min(1),
    mode: ConversationModeSchema,
    input: z.string().trim().min(1).max(MAX_CURRENT_INPUT_CHARS),
    history: z.array(ChatMessageSchema).max(MAX_HISTORY_MESSAGES).default([]),
    summary: SessionSummarySchema.optional(),
    debug: z.boolean().optional()
  })
  .strict();
