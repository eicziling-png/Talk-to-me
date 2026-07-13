import { describe, expect, it } from "vitest";

import { EXPERTS, getExpert } from "@/domain/experts/registry";

const hallmarkConceptsBySlug = {
  freud: [
    "unconscious conflict",
    "repression",
    "transference",
    "dream work",
    "psychosexual development"
  ],
  jung: ["collective unconscious", "archetype", "individuation", "shadow", "anima/animus"],
  bion: ["alpha function", "container-contained", "beta elements", "reverie", "attacks on linking"],
  klein: [
    "paranoid-schizoid position",
    "depressive position",
    "projective identification",
    "internal objects",
    "splitting"
  ],
  winnicott: [
    "holding environment",
    "transitional object",
    "true self/false self",
    "good-enough mother",
    "potential space"
  ],
  kohut: ["self psychology", "empathy", "selfobject", "mirroring", "idealizing transference"],
  yalom: [
    "existential psychotherapy",
    "death",
    "freedom",
    "isolation",
    "meaninglessness",
    "here-and-now"
  ]
} as const;

const allowedEmbeddedConcepts: Partial<
  Record<keyof typeof hallmarkConceptsBySlug, Partial<Record<string, string>>>
> = {
  kohut: {
    transference: "idealizing transference"
  }
};

describe("expert registry", () => {
  it("contains exactly seven unique expert slugs", () => {
    const slugs = EXPERTS.map((expert) => expert.slug);

    expect(slugs).toEqual(["freud", "jung", "bion", "klein", "winnicott", "kohut", "yalom"]);
    expect(new Set(slugs).size).toBe(7);
  });

  it("contains complete structured metadata for each expert", () => {
    for (const expert of EXPERTS) {
      expect(expert.nameZh.trim()).not.toBe("");
      expect(expert.nameEn.trim()).not.toBe("");
      expect(expert.era.trim()).not.toBe("");
      expect(expert.school.trim()).not.toBe("");
      expect(expert.coreTheories.length).toBeGreaterThan(0);
      expect(expert.adjacentTheories.length).toBeGreaterThan(0);
      expect(expert.style.length).toBeGreaterThan(0);
      expect(expert.interpretiveLens.length).toBeGreaterThan(0);
      expect(expert.responseRules.length).toBeGreaterThan(0);
      expect(expert.forbiddenPatterns).toContain("Do not diagnose or provide treatment.");
      expect(expert.starterQuestions.length).toBeGreaterThan(0);
      expect(expert.version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it("returns matching experts and null for unknown slugs", () => {
    expect(getExpert("freud")?.nameEn).toBe("Sigmund Freud");
    expect(getExpert("unknown")).toBeNull();
  });

  it("keeps each persona's hallmark concepts owned by that persona only", () => {
    for (const expert of EXPERTS) {
      const ownConcepts = hallmarkConceptsBySlug[expert.slug];
      const ownCoreTheoryText = expert.coreTheories.join(" | ").toLowerCase();
      const otherConcepts = Object.entries(hallmarkConceptsBySlug)
        .filter(([slug]) => slug !== expert.slug)
        .flatMap(([, concepts]) => concepts);

      for (const concept of ownConcepts) {
        expect(ownCoreTheoryText).toContain(concept);
      }

      for (const concept of otherConcepts) {
        const allowedEmbedding = allowedEmbeddedConcepts[expert.slug]?.[concept];
        const textWithoutAllowedEmbedding = allowedEmbedding
          ? ownCoreTheoryText.replaceAll(allowedEmbedding, "")
          : ownCoreTheoryText;

        expect(textWithoutAllowedEmbedding).not.toContain(concept);
      }
    }
  });
});
