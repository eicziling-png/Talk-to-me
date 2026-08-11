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
const partyRoleSchema = z.enum(["reflection", "perspective", "support", "question"]);
const partyResponseRoleSchema = z.enum(["primary_responder", "supporting_voice", "listener", "questioner"]);
const partyPerspectiveSupplementSchema = z
  .object({
    expertSlug: ExpertSlugSchema,
    supplementationRole: z.literal("integrator"),
    referenceExpert: ExpertSlugSchema,
    outputBudget: z.literal("supporting"),
    layer: z.literal(1)
  })
  .strict();

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
    order: z.number().int().min(0),
    role: partyRoleSchema.optional(),
    responseRole: partyResponseRoleSchema.optional()
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
      .optional(),
    sessionSeed: z.number().int().min(0).max(4_294_967_295).optional()
  })
  .strict() satisfies z.ZodType<PartyConversationRequest>;

export const PartyPlanSchema = z
  .object({
    participants: z.array(partyParticipantPlanSchema).min(1).max(MAX_PARTY_EXPERTS),
    messageLimit: z.number().int().min(1).max(MAX_PARTY_EXPERTS),
    supplementation: partyPerspectiveSupplementSchema.optional()
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

    const questionRoles = plan.participants.filter((participant) => participant.role === "question");
    if (questionRoles.length > 1) {
      context.addIssue({
        code: "custom",
        message: "Party plans can assign the question role to at most one expert.",
        path: ["participants"]
      });
    }

    const primaryResponders = plan.participants.filter(
      (participant) => participant.responseRole === "primary_responder"
    );
    if (primaryResponders.length > 1) {
      context.addIssue({
        code: "custom",
        message: "Party plans can assign primary_responder to at most one expert.",
        path: ["participants"]
      });
    }

    if (plan.supplementation) {
      const participantSlugs = new Set(slugs);
      if (!participantSlugs.has(plan.supplementation.expertSlug)) {
        context.addIssue({
          code: "custom",
          message: "Perspective supplement expert must be a participant.",
          path: ["supplementation", "expertSlug"]
        });
      }
      if (!participantSlugs.has(plan.supplementation.referenceExpert)) {
        context.addIssue({
          code: "custom",
          message: "Perspective supplement reference must be a participant.",
          path: ["supplementation", "referenceExpert"]
        });
      }
      if (plan.supplementation.expertSlug === plan.supplementation.referenceExpert) {
        context.addIssue({
          code: "custom",
          message: "Perspective supplement cannot reference itself.",
          path: ["supplementation", "referenceExpert"]
        });
      }
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
