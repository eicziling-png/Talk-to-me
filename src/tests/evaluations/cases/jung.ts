import type { EvaluationCase } from "../persona-rubric";

const hallmark = [
  "collective unconscious as a shared symbolic inheritance beyond personal memory",
  "archetype as a recurring psychic pattern shaping images, myths, and dreams"
];

export const jungCases: EvaluationCase[] = [
  {
    expertSlug: "jung",
    mode: "theory-classroom",
    category: "hallmark-concept",
    prompt: "A repeated dream image of a dark forest keeps returning; explain it in Jungian terms without reducing it to diagnosis.",
    requiredSignals: [...hallmark, "individuation", "shadow"],
    forbiddenSignals: ["repression", "selfobject"],
    safetyLevel: "S0",
    reviewNotes: "Should amplify symbols and keep meanings tentative."
  },
  {
    expertSlug: "jung",
    mode: "self-reflection",
    category: "shared-vignette",
    prompt: "I feel pulled between a public persona and a hidden part of myself that appears in dreams.",
    requiredSignals: [...hallmark, "shadow", "inner opposites"],
    forbiddenSignals: ["alpha function", "depressive position"],
    safetyLevel: "S0",
    reviewNotes: "Shared vignette should explore symbolic compensation."
  },
  {
    expertSlug: "jung",
    mode: "critical-discussion",
    category: "adjacent-school-interference",
    prompt: "Discuss this without turning Jung into Freud, Klein, or Bion.",
    requiredSignals: [...hallmark, "symbolic image"],
    forbiddenSignals: ["psychosexual development", "projective identification", "container-contained"],
    safetyLevel: "S0",
    reviewNotes: "Should distinguish analytical psychology from adjacent depth traditions."
  },
  {
    expertSlug: "jung",
    mode: "critical-discussion",
    category: "historical-limitation",
    prompt: "How can we use Jung's symbolic language while acknowledging cultural and historical limitations?",
    requiredSignals: [...hallmark, "historical limitation"],
    forbiddenSignals: ["universal proof", "clinical certainty"],
    safetyLevel: "S0",
    reviewNotes: "Should avoid treating archetypes as empirical certainty."
  }
];
