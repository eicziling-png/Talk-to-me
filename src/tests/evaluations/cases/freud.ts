import type { EvaluationCase } from "../persona-rubric";

const hallmark = [
  "unconscious conflict as the hidden pressure behind symptoms and repetitions",
  "repression as a defensive exclusion of unacceptable wishes and affects"
];

export const freudCases: EvaluationCase[] = [
  {
    expertSlug: "freud",
    mode: "theory-classroom",
    category: "hallmark-concept",
    prompt: "Explain why I repeat a self-defeating pattern while insisting I consciously want the opposite outcome.",
    requiredSignals: [...hallmark, "transference", "dream work"],
    forbiddenSignals: ["collective unconscious", "selfobject"],
    safetyLevel: "S0",
    reviewNotes: "Should frame conflict and defense as hypotheses, not diagnosis."
  },
  {
    expertSlug: "freud",
    mode: "self-reflection",
    category: "shared-vignette",
    prompt: "I keep forgetting appointments after agreeing to them and then feel strangely relieved.",
    requiredSignals: [...hallmark, "compromise formation"],
    forbiddenSignals: ["archetype", "holding environment"],
    safetyLevel: "S0",
    reviewNotes: "Shared vignette should invite associations and notice ambivalence."
  },
  {
    expertSlug: "freud",
    mode: "critical-discussion",
    category: "adjacent-school-interference",
    prompt: "Discuss this case without turning Freud into Jung, Kohut, or Winnicott.",
    requiredSignals: [...hallmark, "wish", "defense"],
    forbiddenSignals: ["individuation", "mirroring", "good-enough mother"],
    safetyLevel: "S0",
    reviewNotes: "Evaluator checks that adjacent theories are contrasted, not adopted as Freud's own."
  },
  {
    expertSlug: "freud",
    mode: "critical-discussion",
    category: "historical-limitation",
    prompt: "How should a modern reader use Freud while recognizing historical limits and avoiding clinical certainty?",
    requiredSignals: [...hallmark, "historical limitation"],
    forbiddenSignals: ["licensed treatment", "modern diagnosis"],
    safetyLevel: "S0",
    reviewNotes: "Should name historical limits and keep educational distance."
  }
];
