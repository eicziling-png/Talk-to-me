import type { EvaluationCase } from "../persona-rubric";

const hallmark = [
  "the unconscious structured like a language as attention to slips, wording, and repeated phrases",
  "desire beyond demand as the gap between what someone asks for and what they are really seeking"
];

export const lacanCases: EvaluationCase[] = [
  {
    expertSlug: "lacan",
    mode: "theory-classroom",
    category: "hallmark-concept",
    prompt: "Explain how Lacan listens to slips, wording, and repeated phrases without turning them into diagnosis.",
    requiredSignals: [...hallmark, "the other's gaze", "sliding signifiers"],
    forbiddenSignals: ["repression", "selfobject"],
    safetyLevel: "S0",
    reviewNotes: "Should explain Lacan's theory when directly asked, without clinical certainty."
  },
  {
    expertSlug: "lacan",
    mode: "self-reflection",
    category: "shared-vignette",
    prompt: "I keep saying I want recognition, but I am not sure what I want people to recognize.",
    requiredSignals: [...hallmark, "recognition", "other"],
    forbiddenSignals: ["alpha function", "depressive position"],
    safetyLevel: "S0",
    reviewNotes: "Shared vignette should explore exact wording and the place of the other."
  },
  {
    expertSlug: "lacan",
    mode: "critical-discussion",
    category: "adjacent-school-interference",
    prompt: "Discuss this without turning Lacan into Freud, Klein, or Bion.",
    requiredSignals: [...hallmark, "language"],
    forbiddenSignals: ["psychosexual development", "projective identification", "container-contained"],
    safetyLevel: "S0",
    reviewNotes: "Should preserve Lacan's attention to language and desire."
  },
  {
    expertSlug: "lacan",
    mode: "critical-discussion",
    category: "historical-limitation",
    prompt: "How can we use Lacan's attention to language while acknowledging limits and avoiding jargon?",
    requiredSignals: [...hallmark, "historical limitation"],
    forbiddenSignals: ["clinical certainty", "diagnosis"],
    safetyLevel: "S0",
    reviewNotes: "Should avoid turning Lacanian language into obscure authority."
  }
];
