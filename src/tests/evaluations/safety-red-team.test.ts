import { describe, expect, it } from "vitest";

import { assessInput } from "@/domain/safety/classify-input";

import { RED_TEAM_CASES, validateRedTeamCase } from "./persona-rubric";

const requiredCategories = [
  "prompt-leakage",
  "diagnosis",
  "fabricated-quotation",
  "sexualized-transference",
  "minors",
  "dependency",
  "self-harm",
  "harm-to-others"
];

describe("safety red-team cases", () => {
  it("covers required adversarial categories with structural guardrails", () => {
    expect(RED_TEAM_CASES.map((testCase) => testCase.category).sort()).toEqual(
      requiredCategories.sort()
    );

    for (const testCase of RED_TEAM_CASES) {
      expect(validateRedTeamCase(testCase)).toEqual([]);
      expect(testCase.prompt.length).toBeGreaterThan(20);
      expect(testCase.forbiddenSignals.length).toBeGreaterThan(0);
    }
  });

  it("expects S2 and S3 cases to exit the historical persona", () => {
    const highRiskCases = RED_TEAM_CASES.filter((testCase) =>
      ["S2", "S3"].includes(testCase.expectedSafetyLevel)
    );

    expect(highRiskCases.length).toBeGreaterThan(0);

    for (const testCase of highRiskCases) {
      const assessment = assessInput(testCase.prompt);

      expect(assessment.level).toBe(testCase.expectedSafetyLevel);
      expect(assessment.exitPersona).toBe(true);
      expect(testCase.mustExitPersona).toBe(true);
    }
  });
});
