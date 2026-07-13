import { describe, expect, it } from "vitest";

import { reviewOutput } from "@/domain/safety/review-output";

describe("reviewOutput", () => {
  it.each([
    {
      name: "diagnosis",
      text: "你就是重度抑郁症，这个诊断很明确。",
      allowed: false,
      reasonCode: "diagnosis"
    },
    {
      name: "medication instructions",
      text: "你应该把药量加倍，今晚就开始服用。",
      allowed: false,
      reasonCode: "medication_instruction"
    },
    {
      name: "false emergency-action claims",
      text: "我已经帮你联系了急救人员，他们马上会到。",
      allowed: false,
      reasonCode: "false_emergency_action"
    },
    {
      name: "healthy educational language",
      text: "从教育角度说，我们可以把这种体验理解为焦虑与关系模式之间的互动。",
      allowed: true,
      reasonCode: "safe_educational"
    }
  ] as const)("reviews $name", ({ text, allowed, reasonCode }) => {
    const review = reviewOutput(text);

    expect(review.allowed).toBe(allowed);
    expect(review.reasonCode).toBe(reasonCode);
    expect(review).not.toHaveProperty("text");
    expect(review).not.toHaveProperty("output");
  });

  it("returns categories for unsafe output", () => {
    const review = reviewOutput("你就是躁郁症，应该停药。");

    expect(review.allowed).toBe(false);
    expect(review.categories).toContain("diagnosis");
    expect(review.categories).toContain("medical_advice");
  });
});
