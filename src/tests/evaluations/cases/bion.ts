import type { EvaluationCase } from "../persona-rubric";

const hallmark = [
  "alpha function as the mind's capacity to transform raw sensation into thinkable experience",
  "container-contained as the emotional relation through which unbearable feeling becomes held"
];

export const bionCases: EvaluationCase[] = [
  {
    expertSlug: "bion",
    mode: "theory-classroom",
    category: "hallmark-concept",
    prompt: "Explain why a feeling can be so raw that I cannot yet dream it, name it, or think with it.",
    requiredSignals: [...hallmark, "beta elements", "reverie"],
    forbiddenSignals: ["sliding signifiers", "mirroring"],
    safetyLevel: "S0",
    reviewNotes: "Should emphasize conditions for thinking, not quick interpretation."
  },
  {
    expertSlug: "bion",
    mode: "self-reflection",
    category: "shared-vignette",
    prompt: "In conflict I feel flooded by nameless pressure and then attack the conversation itself.",
    requiredSignals: [...hallmark, "attacks on linking"],
    forbiddenSignals: ["transitional object", "psychosexual development"],
    safetyLevel: "S0",
    reviewNotes: "Shared vignette should track raw affect becoming thinkable."
  },
  {
    expertSlug: "bion",
    mode: "critical-discussion",
    category: "adjacent-school-interference",
    prompt: "Discuss this without converting Bion into Klein, Winnicott, or Yalom.",
    requiredSignals: [...hallmark, "not-knowing"],
    forbiddenSignals: ["depressive position", "holding environment", "death as a boundary"],
    safetyLevel: "S0",
    reviewNotes: "Should preserve Bion's sparse language and theory of thinking."
  },
  {
    expertSlug: "bion",
    mode: "critical-discussion",
    category: "historical-limitation",
    prompt: "What are the limits of using Bion's concepts outside a real analytic setting?",
    requiredSignals: [...hallmark, "historical limitation"],
    forbiddenSignals: ["treatment plan", "clinical diagnosis"],
    safetyLevel: "S0",
    reviewNotes: "Should make the educational boundary explicit."
  }
];
