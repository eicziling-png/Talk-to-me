import type { OutputReview, OutputReviewCategory } from "./types";

const diagnosisTerms = [
  "诊断",
  "你就是",
  "明确是",
  "重度抑郁症",
  "躁郁症",
  "人格障碍",
  "bipolar disorder",
  "major depression",
  "personality disorder"
];

const medicationInstructionTerms = [
  "药量",
  "加倍",
  "停药",
  "服用",
  "处方",
  "take medication",
  "stop medication",
  "double your dose"
];

const falseEmergencyActionTerms = [
  "我已经帮你联系",
  "我已经联系",
  "急救人员马上会到",
  "警察马上会到",
  "i contacted emergency",
  "help is on the way"
];

export function reviewOutput(text: string): OutputReview {
  const normalized = normalize(text);
  const categories = new Set<OutputReviewCategory>();

  if (includesAny(normalized, diagnosisTerms)) {
    categories.add("diagnosis");
  }

  if (includesAny(normalized, medicationInstructionTerms)) {
    categories.add("medical_advice");
  }

  if (includesAny(normalized, falseEmergencyActionTerms)) {
    categories.add("false_emergency_action");
  }

  if (categories.has("diagnosis")) {
    return {
      allowed: false,
      categories: [...categories],
      reasonCode: "diagnosis"
    };
  }

  if (categories.has("medical_advice")) {
    return {
      allowed: false,
      categories: [...categories],
      reasonCode: "medication_instruction"
    };
  }

  if (categories.has("false_emergency_action")) {
    return {
      allowed: false,
      categories: [...categories],
      reasonCode: "false_emergency_action"
    };
  }

  return {
    allowed: true,
    categories: ["safe_educational"],
    reasonCode: "safe_educational"
  };
}

function normalize(text: string): string {
  return text.toLocaleLowerCase().normalize("NFKC").replace(/\s+/g, " ").trim();
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}
