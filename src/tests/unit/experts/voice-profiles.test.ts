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
  it("defines seven Chinese master-voice profiles", () => {
    expect(EXPERT_VOICE_PROFILES.map((profile) => profile.slug)).toEqual([
      "freud",
      "jung",
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

  it("looks up a profile by expert slug", () => {
    expect(getExpertVoiceProfile("bion")?.name).toBe("威尔弗雷德·比昂");
    expect(getExpertVoiceProfile("unknown")).toBeNull();
  });
});
