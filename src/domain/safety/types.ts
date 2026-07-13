export type SafetyLevel = "S0" | "S1" | "S2" | "S3";

export type SafetyCategory =
  | "neutral"
  | "distress"
  | "self_harm"
  | "imminent_danger"
  | "harm_to_others";

export type SafetyReasonCode =
  | "neutral"
  | "distress"
  | "self_harm_non_imminent"
  | "imminent_danger"
  | "harm_to_others_imminent";

export type SafetyAssessment = {
  level: SafetyLevel;
  categories: SafetyCategory[];
  exitPersona: boolean;
  reasonCode: SafetyReasonCode;
};

export type OutputReviewCategory =
  | "diagnosis"
  | "medical_advice"
  | "false_emergency_action"
  | "safe_educational";

export type OutputReviewReasonCode =
  | "diagnosis"
  | "medication_instruction"
  | "false_emergency_action"
  | "safe_educational";

export type OutputReview = {
  allowed: boolean;
  categories: OutputReviewCategory[];
  reasonCode: OutputReviewReasonCode;
};
