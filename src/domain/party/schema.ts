import { z } from "zod";

import { ExpertSlugSchema } from "@/domain/experts/schema";

import type { PartyConversationRequest, PartyPlan, PartyStreamEvent } from "./types";

const MAX_PARTY_EXPERTS = ExpertSlugSchema.options.length;
const MAX_PARTY_INPUT_CHARS = 4_000;
const MAX_PARTY_HISTORY_MESSAGES = 80;
const MAX_PARTY_HISTORY_MESSAGE_CHARS = 4_000;
const MAX_PARTY_SUMMARY_CHARS = 2_000;
const MAX_PARTY_FOCUS_CHARS = 240;
const MAX_PARTY_EVENT_TEXT_CHARS = 8_000;

const partyMessageSchema = z.discriminatedUnion("role", [
  z
    .object({
      role: z.literal("user"),
      content: z.string().trim().min(1).max(MAX_PARTY_HISTORY_MESSAGE_CHARS)
    })
    .strict(),
  z
    .object({
      role: z.literal("expert"),
      expertSlug: ExpertSlugSchema,
      content: z.string().trim().min(1).max(MAX_PARTY_HISTORY_MESSAGE_CHARS)
    })
    .strict()
]);

const partyParticipantPlanSchema = z
  .object({
    expertSlug: ExpertSlugSchema,
    focus: z.string().trim().min(1).max(MAX_PARTY_FOCUS_CHARS),
    order: z.number().int().min(0)
  })
  .strict();

export const PartyConversationRequestSchema = z
  .object({
    mode: z.literal("self-reflection"),
    input: z.string().trim().min(1).max(MAX_PARTY_INPUT_CHARS),
    history: z.array(partyMessageSchema).max(MAX_PARTY_HISTORY_MESSAGES).default([]),
    summary: z
      .object({ content: z.string().trim().min(1).max(MAX_PARTY_SUMMARY_CHARS) })
      .strict()
      .optional()
  })
  .strict() satisfies z.ZodType<PartyConversationRequest>;

export const PartyPlanSchema = z
  .object({
    participants: z.array(partyParticipantPlanSchema).min(1).max(MAX_PARTY_EXPERTS),
    messageLimit: z.number().int().min(1).max(MAX_PARTY_EXPERTS)
  })
  .strict()
  .superRefine((plan, context) => {
    const slugs = plan.participants.map((participant) => participant.expertSlug);
    if (new Set(slugs).size !== slugs.length) {
      context.addIssue({
        code: "custom",
        message: "Party plans cannot contain duplicate experts.",
        path: ["participants"]
      });
    }

    const orders = plan.participants.map((participant) => participant.order).toSorted((a, b) => a - b);
    if (orders.some((order, index) => order !== index)) {
      context.addIssue({
        code: "custom",
        message: "Party participant order must be contiguous from zero.",
        path: ["participants"]
      });
    }

    if (plan.messageLimit < plan.participants.length) {
      context.addIssue({
        code: "custom",
        message: "Party message limit cannot be lower than participant count.",
        path: ["messageLimit"]
      });
    }
  }) satisfies z.ZodType<PartyPlan>;

const expertStartEventSchema = z
  .object({
    type: z.literal("expert_start"),
    id: z.string().trim().min(1),
    expertSlug: ExpertSlugSchema,
    order: z.number().int().min(0)
  })
  .strict();

const expertDeltaEventSchema = z
  .object({
    type: z.literal("expert_delta"),
    id: z.string().trim().min(1),
    expertSlug: ExpertSlugSchema,
    text: z.string().min(1).max(MAX_PARTY_EVENT_TEXT_CHARS)
  })
  .strict();

export const PartyStreamEventSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("plan")
    })
    .strict(),
  expertStartEventSchema,
  expertDeltaEventSchema,
  z
    .object({
      type: z.literal("expert_done"),
      id: z.string().trim().min(1),
      expertSlug: ExpertSlugSchema,
      complete: z.boolean()
    })
    .strict(),
  z
    .object({
      type: z.literal("turn_done"),
      expertMessageCount: z.number().int().min(0).max(MAX_PARTY_EXPERTS)
    })
    .strict(),
  z
    .object({
      type: z.literal("error"),
      code: z.string().trim().min(1).max(120)
    })
    .strict(),
  z
    .object({
      type: z.literal("safety"),
      level: z.enum(["S0", "S1", "S2", "S3"]),
      text: z.string().trim().min(1).max(MAX_PARTY_EVENT_TEXT_CHARS)
    })
    .strict(),
  z.object({ type: z.literal("done") }).strict()
]) satisfies z.ZodType<PartyStreamEvent>;
