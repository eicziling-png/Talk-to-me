import { describe, expect, it } from "vitest";

import {
  EXPERT_VOICE_PROFILES,
  getExpertVoiceProfile
} from "@/domain/experts/voice-profiles";

const forbiddenVisibleFraming = [
  "AI",
  "人工智能",
  "模拟",
  "simulation",
  "based on",
  "根据",
  "理论认为",
  "提出了",
  "数据库"
];

describe("expert voice profiles", () => {
  it("defines seven Chinese master-voice profiles with Lacan replacing Jung", () => {
    expect(EXPERT_VOICE_PROFILES.map((profile) => profile.slug)).toEqual([
      "freud",
      "lacan",
      "bion",
      "klein",
      "winnicott",
      "kohut",
      "yalom"
    ]);

    for (const profile of EXPERT_VOICE_PROFILES) {
      expect(profile.name.trim()).not.toBe("");
      expect(profile.eraContext.trim()).not.toBe("");
      expect(profile.corePersonality.trim()).not.toBe("");
      expect(profile.attendsTo.length).toBeGreaterThanOrEqual(4);
      expect(profile.languageStyle.length).toBeGreaterThanOrEqual(3);
      expect(profile.likelyQuestions.length).toBeGreaterThanOrEqual(3);
      expect(profile.avoidExpressions.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("keeps theory as hidden attention rather than visible lecture phrasing", () => {
    for (const profile of EXPERT_VOICE_PROFILES) {
      const visibleVoiceText = [
        profile.corePersonality,
        ...profile.attendsTo,
        ...profile.languageStyle,
        ...profile.likelyQuestions
      ].join("\n");

      for (const forbidden of forbiddenVisibleFraming) {
        expect(visibleVoiceText).not.toContain(forbidden);
      }

      expect(profile.avoidExpressions.join("\n")).toContain("不要说自己是 AI");
      expect(profile.avoidExpressions.join("\n")).toContain("不要讲课");
    }
  });

  it("looks up Lacan by expert slug and removes Jung", () => {
    expect(getExpertVoiceProfile("lacan")).toMatchObject({
      slug: "lacan",
      name: "雅克·拉康"
    });
    expect(getExpertVoiceProfile("jung")).toBeNull();
    expect(getExpertVoiceProfile("unknown")).toBeNull();
  });

  it("gives Lacan language-focused attention without Jungian residue", () => {
    const lacan = getExpertVoiceProfile("lacan");
    const text = [
      lacan?.eraContext,
      lacan?.corePersonality,
      ...(lacan?.attendsTo ?? []),
      ...(lacan?.languageStyle ?? []),
      ...(lacan?.likelyQuestions ?? [])
    ].join("\n");

    expect(text).toContain("语言");
    expect(text).toContain("欲望");
    expect(text).not.toContain("梦");
    expect(text).not.toContain("象征");
    expect(text).not.toContain("集体无意识");
    expect(text).not.toContain("原型");
    expect(text).not.toContain("阴影");
  });
});
