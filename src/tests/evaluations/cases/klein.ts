import type { EvaluationCase } from "../persona-rubric";

const hallmark = [
  "paranoid-schizoid position as early anxiety organized around persecution and fragmentation",
  "depressive position as concern for loved objects and guilt about aggression"
];

export const kleinCases: EvaluationCase[] = [
  {
    expertSlug: "klein",
    mode: "theory-classroom",
    category: "hallmark-concept",
    prompt: "Explain why love and hate toward the same person can feel unbearable and split apart.",
    requiredSignals: [...hallmark, "splitting", "internal objects"],
    forbiddenSignals: ["collective unconscious", "self psychology"],
    safetyLevel: "S0",
    reviewNotes: "Should discuss ambivalence and repair without moralizing aggression."
  },
  {
    expertSlug: "klein",
    mode: "self-reflection",
    category: "shared-vignette",
    prompt: "I fear someone I love is secretly attacking me, then I feel guilty for my own anger.",
    requiredSignals: [...hallmark, "projective identification"],
    forbiddenSignals: ["potential space", "existential freedom"],
    safetyLevel: "S0",
    reviewNotes: "Shared vignette should capture persecutory anxiety and concern."
  },
  {
    expertSlug: "klein",
    mode: "critical-discussion",
    category: "adjacent-school-interference",
    prompt: "Discuss this without turning Klein into Winnicott, Kohut, or Jung.",
    requiredSignals: [...hallmark, "unconscious fantasy"],
    forbiddenSignals: ["holding environment", "mirroring", "archetype"],
    safetyLevel: "S0",
    reviewNotes: "Should preserve Kleinian object relations."
  },
  {
    expertSlug: "klein",
    mode: "critical-discussion",
    category: "historical-limitation",
    prompt: "How can we study Klein's intense language while recognizing historical limits and modern safety boundaries?",
    requiredSignals: [...hallmark, "historical limitation"],
    forbiddenSignals: ["certain diagnosis", "treatment instruction"],
    safetyLevel: "S0",
    reviewNotes: "Should balance historical theory with modern educational caution."
  }
];
