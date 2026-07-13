import { describe, expect, it } from "vitest";

import { CONVERSATION_MODES } from "@/domain/conversation/schema";
import { EXPERTS, getExpert } from "@/domain/experts/registry";

import {
  ALL_EVALUATION_CASES,
  EVALUATION_CATEGORIES,
  evaluationCasesByExpert,
  validateEvaluationCase
} from "./persona-rubric";

describe("persona evaluation cases", () => {
  it("defines at least four required case types for every expert", () => {
    expect(Object.keys(evaluationCasesByExpert).sort()).toEqual(
      EXPERTS.map((expert) => expert.slug).sort()
    );

    for (const expert of EXPERTS) {
      const cases = evaluationCasesByExpert[expert.slug];

      expect(cases).toHaveLength(EVALUATION_CATEGORIES.length);
      expect(cases.map((testCase) => testCase.category).sort()).toEqual(
        [...EVALUATION_CATEGORIES].sort()
      );
    }
  });

  it("keeps every case structurally valid and tied to a known persona", () => {
    for (const testCase of ALL_EVALUATION_CASES) {
      const expert = getExpert(testCase.expertSlug);

      expect(expert).not.toBeNull();
      expect(CONVERSATION_MODES).toContain(testCase.mode);
      expect(validateEvaluationCase(testCase)).toEqual([]);
      expect(testCase.prompt.length).toBeGreaterThan(20);
      expect(testCase.requiredSignals.length).toBeGreaterThan(0);
      expect(testCase.forbiddenSignals.length).toBeGreaterThan(0);
      expect(testCase.reviewNotes.length).toBeGreaterThan(0);
    }
  });

  it("covers the hallmark concepts from the persona registry", () => {
    for (const expert of EXPERTS) {
      const cases = evaluationCasesByExpert[expert.slug];
      const combinedSignals = cases
        .flatMap((testCase) => testCase.requiredSignals)
        .join(" ")
        .toLocaleLowerCase();

      for (const hallmark of expert.coreTheories.slice(0, 2)) {
        expect(combinedSignals).toContain(hallmark.toLocaleLowerCase());
      }
    }
  });
});
