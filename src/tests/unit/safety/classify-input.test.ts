import { describe, expect, it } from "vitest";

import { buildSafetyResponse } from "@/domain/safety/crisis-response";
import { assessInput } from "@/domain/safety/classify-input";

describe("assessInput", () => {
  it.each([
    {
      name: "neutral study question",
      text: "我想从学术角度了解温尼科特的过渡客体概念。",
      level: "S0",
      exitPersona: false,
      reasonCode: "neutral"
    },
    {
      name: "distress without self-harm",
      text: "最近我很焦虑，也很孤独，想知道可以怎样理解这种感受。",
      level: "S1",
      exitPersona: false,
      reasonCode: "distress"
    },
    {
      name: "non-imminent self-harm",
      text: "有时候我会想到伤害自己，但现在没有计划，也没有马上要做。",
      level: "S2",
      exitPersona: true,
      reasonCode: "self_harm_non_imminent"
    },
    {
      name: "imminent danger",
      text: "我今晚准备结束生命，方法已经想好了。",
      level: "S3",
      exitPersona: true,
      reasonCode: "imminent_danger"
    }
  ] as const)("classifies $name as $level", ({ text, level, exitPersona, reasonCode }) => {
    const assessment = assessInput(text);

    expect(assessment.level).toBe(level);
    expect(assessment.exitPersona).toBe(exitPersona);
    expect(assessment.reasonCode).toBe(reasonCode);
    expect(assessment).not.toHaveProperty("text");
    expect(assessment).not.toHaveProperty("input");
  });

  it("exits persona for harm to others with immediate intent", () => {
    const assessment = assessInput("我马上要去伤害那个人，我已经在路上了。");

    expect(assessment.level).toBe("S3");
    expect(assessment.categories).toContain("harm_to_others");
    expect(assessment.exitPersona).toBe(true);
  });
});

describe("buildSafetyResponse", () => {
  it("builds modern non-persona support text without phone numbers or emergency claims", () => {
    const response = buildSafetyResponse(assessInput("我今晚准备结束生命，方法已经想好了。"));

    expect(response).toContain("我不能继续以历史人物角色回应");
    expect(response).toContain("请立刻联系当地紧急服务");
    expect(response).not.toMatch(/\d{3,}/);
    expect(response).not.toContain("我已经联系");
    expect(response).not.toContain("弗洛伊德");
    expect(response).not.toContain("荣格");
  });
});
