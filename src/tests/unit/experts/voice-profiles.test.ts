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

  it("defines differentiated opening, deepening, wording, and avoidance guidance for every expert", () => {
    const requiredDistinctions = {
      freud: ["先从眼前的事说起", "梦、欲望、防御、重复或早年经验", "也许可以先看看", "焦虑或童年解释"],
      lacan: ["留意你刚才选用的词", "重复、说给谁听和欲望", "你刚才用了哪个词", "密集的象征系统解释"],
      bion: ["可以先打个招呼", "还没有成形", "短句和停顿", "我会接住你"],
      klein: ["先从用户此刻说的事开始", "爱与害怕、愤怒与内疚、矛盾", "一方面……另一方面……", "童年创伤"],
      winnicott: ["像日常交谈一样", "活着的感觉、真实或顺从、给自己留出空间", "有空间", "不要急"],
      kohut: ["尊重地回应", "羞耻、骄傲、崩塌或被看见", "对你来说", "未被满足的认可"],
      yalom: ["像聊天一样开始", "选择、责任、孤独或意义", "你能选择什么", "把普通聊天变成哲学"
      ]
    } as const;

    for (const profile of EXPERT_VOICE_PROFILES) {
      expect(profile.openingStyle).toEqual(expect.any(Array));
      expect(profile.openingStyle.length).toBeGreaterThan(0);
      expect(profile.deepeningStyle).toEqual(expect.any(Array));
      expect(profile.deepeningStyle.length).toBeGreaterThan(0);
      expect(profile.wordingTendencies).toEqual(expect.any(Array));
      expect(profile.wordingTendencies.length).toBeGreaterThan(0);
      expect(profile.avoidTemplates).toEqual(expect.any(Array));
      expect(profile.avoidTemplates.length).toBeGreaterThan(0);

      const [opening, deepening, wording, avoidance] = requiredDistinctions[profile.slug];
      expect(profile.openingStyle.join("\n")).toContain(opening);
      expect(profile.deepeningStyle.join("\n")).toContain(deepening);
      expect(profile.wordingTendencies.join("\n")).toContain(wording);
      expect(profile.avoidTemplates.join("\n")).toContain(avoidance);
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
