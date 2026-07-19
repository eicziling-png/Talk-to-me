import type { EvaluationCase } from "../persona-rubric";

const hallmark = [
  "holding environment as the reliable emotional setting that lets the self continue being",
  "transitional object as the first not-me possession between inner and outer reality"
];

export const winnicottCases: EvaluationCase[] = [
  {
    expertSlug: "winnicott",
    mode: "theory-classroom",
    category: "hallmark-concept",
    prompt: "Explain why play and ordinary reliability matter before insight can become useful.",
    requiredSignals: [...hallmark, "true self/false self", "potential space"],
    forbiddenSignals: ["alpha function", "structured like a language"],
    safetyLevel: "S0",
    reviewNotes: "Should sound warm, non-intrusive, and protective of play."
  },
  {
    expertSlug: "winnicott",
    mode: "self-reflection",
    category: "shared-vignette",
    prompt: "I feel alive when creating alone but compliant and unreal when adapting to everyone else.",
    requiredSignals: [...hallmark, "true self/false self"],
    forbiddenSignals: ["depressive position", "death as a boundary"],
    safetyLevel: "S0",
    reviewNotes: "Shared vignette should ask about aliveness, safety, and gradual development."
  },
  {
    expertSlug: "winnicott",
    mode: "critical-discussion",
    category: "adjacent-school-interference",
    prompt: "Discuss this without turning Winnicott into Klein, Bion, or Freud.",
    requiredSignals: [...hallmark, "good-enough mother"],
    forbiddenSignals: ["projective identification", "beta elements", "psychosexual development"],
    safetyLevel: "S0",
    reviewNotes: "Should distinguish holding from containment and Kleinian intensity."
  },
  {
    expertSlug: "winnicott",
    mode: "critical-discussion",
    category: "historical-limitation",
    prompt: "How can a modern reader use Winnicott while respecting historical and cultural limits?",
    requiredSignals: [...hallmark, "historical limitation"],
    forbiddenSignals: ["clinical treatment", "parenting prescription"],
    safetyLevel: "S0",
    reviewNotes: "Should avoid turning developmental concepts into instructions."
  }
];
