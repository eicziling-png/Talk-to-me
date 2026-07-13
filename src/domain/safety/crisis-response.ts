import type { SafetyAssessment } from "./types";

export function buildSafetyResponse(assessment: SafetyAssessment): string {
  if (assessment.level === "S0" || assessment.level === "S1") {
    return "你可以继续以教育和自我反思的方式探索这个主题。";
  }

  if (assessment.level === "S3") {
    return [
      "我不能继续以历史人物角色回应，因为你提到的内容可能涉及立即危险。",
      "请立刻联系当地紧急服务、身边可信赖的人，或前往最近的急诊/安全地点。",
      "如果可以，请把可能伤害自己或他人的工具移开，并让另一个人陪在你身边。",
      "我不会声称已经联系任何人；现在最重要的是你获得现实中的即时支持。"
    ].join("\n");
  }

  return [
    "我不能继续以历史人物角色回应，因为你提到的内容涉及自我伤害风险。",
    "请尽快联系身边可信赖的人、当地心理危机支持或医疗专业人员，并告诉他们你正在经历什么。",
    "如果风险变得紧急，请立刻联系当地紧急服务或前往安全地点。",
    "我不会提供诊断或治疗指令，也不会声称已经联系任何人。"
  ].join("\n");
}
