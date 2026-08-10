import type { ExpertSlug } from "@/domain/experts/types";
import type { SafetyLevel } from "@/domain/safety/types";

export type PartyConversationMode = "self-reflection";

export type PartyConversationRequest = {
  mode: PartyConversationMode;
  input: string;
  history: PartyMessage[];
  summary?: { content: string };
  sessionSeed?: number;
};

export type PartyConversationRole = "reflection" | "perspective" | "support" | "question";
export type PartyResponseRole = "primary_responder" | "supporting_voice" | "listener" | "questioner";

export type PartyMessage =
  | {
      role: "user";
      content: string;
    }
  | {
      role: "expert";
      expertSlug: ExpertSlug;
      content: string;
    };

export type PartyParticipantPlan = {
  expertSlug: ExpertSlug;
  focus: string;
  order: number;
  role?: PartyConversationRole;
  responseRole?: PartyResponseRole;
};

export type PartyPlan = {
  participants: PartyParticipantPlan[];
  messageLimit: number;
};

export type PartyStreamEvent =
  | {
      type: "plan";
    }
  | {
      type: "expert_start";
      id: string;
      expertSlug: ExpertSlug;
      order: number;
    }
  | {
      type: "expert_delta";
      id: string;
      expertSlug: ExpertSlug;
      text: string;
    }
  | {
      type: "expert_done";
      id: string;
      expertSlug: ExpertSlug;
      complete: boolean;
    }
  | {
      type: "turn_done";
      expertMessageCount: number;
    }
  | {
      type: "error";
      code: string;
    }
  | {
      type: "safety";
      level: SafetyLevel;
      text: string;
    }
  | {
      type: "done";
    };

export type PartyBrowserMessage = {
  id: string;
  role: "user" | "expert";
  expertSlug?: ExpertSlug;
  content: string;
  complete?: boolean;
  createdAt?: number;
};

export type PartySessionStatus = "idle" | "streaming" | "failed" | "interrupted";

export type PartySession = {
  mode: PartyConversationMode;
  messages: PartyBrowserMessage[];
  status: PartySessionStatus;
  failedInput: string | null;
  sessionSeed: number;
};
