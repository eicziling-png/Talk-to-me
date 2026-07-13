import type { ConversationRequest } from "@/domain/conversation/types";
import type { SafetyLevel } from "@/domain/safety/types";

export type TelemetryOutcome =
  | "validation_error"
  | "expert_not_found"
  | "provider_timeout"
  | "provider_unavailable"
  | "streamed"
  | "internal_error";

export type TelemetryEvent = {
  requestId: string;
  durationMs: number;
  outcome: TelemetryOutcome;
  riskLevel: SafetyLevel;
  anonymousTokenEstimate: number;
};

export function buildTelemetryEvent(input: {
  requestId: string;
  startedAtMs: number;
  endedAtMs: number;
  outcome: TelemetryOutcome;
  riskLevel: SafetyLevel;
  anonymousTokenEstimate: number;
}): TelemetryEvent {
  return {
    requestId: input.requestId,
    durationMs: Math.max(0, Math.round(input.endedAtMs - input.startedAtMs)),
    outcome: input.outcome,
    riskLevel: input.riskLevel,
    anonymousTokenEstimate: Math.max(0, Math.ceil(input.anonymousTokenEstimate))
  };
}

export function estimateAnonymousTokens(request: ConversationRequest): number {
  const historyChars = request.history.reduce(
    (total, message) => total + message.content.length,
    0
  );
  const summaryChars = request.summary?.content.length ?? 0;

  return Math.ceil((request.input.length + historyChars + summaryChars) / 4);
}
