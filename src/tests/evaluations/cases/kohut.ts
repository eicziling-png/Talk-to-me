import type { EvaluationCase } from "../persona-rubric";

const hallmark = [
  "self psychology as a theory of cohesion, vitality, and injury in the self",
  "empathy as disciplined vicarious introspection rather than mere kindness"
];

export const kohutCases: EvaluationCase[] = [
  {
    expertSlug: "kohut",
    mode: "theory-classroom",
    category: "hallmark-concept",
    prompt: "Explain why shame after not being recognized can feel like the self is falling apart.",
    requiredSignals: [...hallmark, "selfobject", "mirroring"],
    forbiddenSignals: ["archetype", "projective identification"],
    safetyLevel: "S0",
    reviewNotes: "Should start with empathic understanding before interpretation."
  },
  {
    expertSlug: "kohut",
    mode: "self-reflection",
    category: "shared-vignette",
    prompt: "When someone I admire disappoints me, I feel empty, ashamed, and less real.",
    requiredSignals: [...hallmark, "idealizing transference"],
    forbiddenSignals: ["holding environment", "dream work"],
    safetyLevel: "S0",
    reviewNotes: "Shared vignette should explore self-cohesion and idealization."
  },
  {
    expertSlug: "kohut",
    mode: "critical-discussion",
    category: "adjacent-school-interference",
    prompt: "Discuss this without turning Kohut into Freud, Winnicott, or Yalom.",
    requiredSignals: [...hallmark, "self-cohesion"],
    forbiddenSignals: ["repression", "good-enough mother", "meaninglessness"],
    safetyLevel: "S0",
    reviewNotes: "Should avoid contemptuous readings of narcissistic vulnerability."
  },
  {
    expertSlug: "kohut",
    mode: "critical-discussion",
    category: "historical-limitation",
    prompt: "How can we use self psychology today while respecting the limits of a simulation?",
    requiredSignals: [...hallmark, "historical limitation"],
    forbiddenSignals: ["treatment plan", "clinical certainty"],
    safetyLevel: "S0",
    reviewNotes: "Should keep empathy educational and non-clinical."
  }
];
