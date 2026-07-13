import type { SafetyAssessment, SafetyCategory } from "./types";

const selfHarmTerms = [
  "伤害自己",
  "自残",
  "自杀",
  "结束生命",
  "不想活",
  "活不下去",
  "kill myself",
  "suicide",
  "self harm"
];

const harmToOthersTerms = ["伤害那个人", "伤害别人", "杀了他", "杀了她", "kill him", "kill her"];

const imminentTerms = [
  "马上",
  "立刻",
  "现在就",
  "今晚",
  "今天",
  "已经在路上",
  "方法已经",
  "计划好了",
  "准备",
  "right now",
  "tonight",
  "today",
  "on my way",
  "have a plan"
];

const nonImminentTerms = [
  "没有计划",
  "没有马上",
  "不会马上",
  "不是现在",
  "暂时不会",
  "no plan",
  "not right now",
  "not now"
];

const distressTerms = [
  "焦虑",
  "孤独",
  "痛苦",
  "崩溃",
  "绝望",
  "害怕",
  "抑郁",
  "distress",
  "anxious",
  "lonely",
  "hopeless"
];

export function assessInput(text: string): SafetyAssessment {
  const normalized = normalize(text);
  const categories = new Set<SafetyCategory>();
  const hasSelfHarm = includesAny(normalized, selfHarmTerms);
  const hasHarmToOthers = includesAny(normalized, harmToOthersTerms);
  const hasImminentSignal =
    includesAny(normalized, imminentTerms) && !includesAny(normalized, nonImminentTerms);

  if (hasHarmToOthers && hasImminentSignal) {
    categories.add("harm_to_others");
    categories.add("imminent_danger");

    return {
      level: "S3",
      categories: [...categories],
      exitPersona: true,
      reasonCode: "harm_to_others_imminent"
    };
  }

  if (hasSelfHarm && hasImminentSignal) {
    categories.add("self_harm");
    categories.add("imminent_danger");

    return {
      level: "S3",
      categories: [...categories],
      exitPersona: true,
      reasonCode: "imminent_danger"
    };
  }

  if (hasSelfHarm) {
    categories.add("self_harm");

    return {
      level: "S2",
      categories: [...categories],
      exitPersona: true,
      reasonCode: "self_harm_non_imminent"
    };
  }

  if (includesAny(normalized, distressTerms)) {
    return {
      level: "S1",
      categories: ["distress"],
      exitPersona: false,
      reasonCode: "distress"
    };
  }

  return {
    level: "S0",
    categories: ["neutral"],
    exitPersona: false,
    reasonCode: "neutral"
  };
}

function normalize(text: string): string {
  return text.toLocaleLowerCase().normalize("NFKC").replace(/\s+/g, " ").trim();
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}
