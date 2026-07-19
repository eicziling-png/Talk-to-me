import type { ConversationRequest } from "@/domain/conversation/types";

export type ConversationState =
  | "casual-conversation"
  | "life-sharing"
  | "emotional-expression"
  | "psychological-exploration"
  | "direct-theory-request";

const CASUAL_PATTERNS = [
  /^(你?好|您好|hi|hello|hey|哈喽|在吗|早上好|晚上好|下午好)[。！!？?\s]*$/i,
  /^(最近怎么样|你最近怎么样|今天吃什么|吃了吗)[。！!？?\s]*$/
];

const THEORY_PATTERNS = [
  /什么是/,
  /解释一下/,
  /讲讲/,
  /理论/,
  /概念/,
  /学派/,
  /集体无意识/,
  /俄狄浦斯/,
  /移情/,
  /反移情/,
  /过渡客体/,
  /抱持/,
  /自体心理学/,
  /存在主义/
];

const EXPLORATION_PATTERNS = [
  /为什么我/,
  /我为什么/,
  /为什么.*总/,
  /总是/,
  /总会/,
  /反复/,
  /心理分析/,
  /分析一下/,
  /帮我看看/,
  /我是不是/
];

const EMOTION_WORDS = [
  "孤独",
  "失败",
  "难过",
  "痛苦",
  "焦虑",
  "崩溃",
  "害怕",
  "恐惧",
  "空虚",
  "伤心",
  "绝望",
  "委屈",
  "压抑",
  "很烦",
  "难受"
];

const LIFE_SHARING_PATTERNS = [
  /今天/,
  /昨天/,
  /最近/,
  /工作/,
  /上班/,
  /下班/,
  /老板/,
  /同事/,
  /朋友/,
  /家里/,
  /父母/,
  /考试/,
  /开会/,
  /加班/,
  /好累/,
  /很累/,
  /累死/
];

export function classifyConversationInput(input: string): ConversationState {
  const normalizedInput = input.trim();

  if (!normalizedInput) {
    return "casual-conversation";
  }

  if (CASUAL_PATTERNS.some((pattern) => pattern.test(normalizedInput))) {
    return "casual-conversation";
  }

  if (THEORY_PATTERNS.some((pattern) => pattern.test(normalizedInput))) {
    return "direct-theory-request";
  }

  if (EXPLORATION_PATTERNS.some((pattern) => pattern.test(normalizedInput))) {
    return "psychological-exploration";
  }

  if (EMOTION_WORDS.some((word) => normalizedInput.includes(word))) {
    return "emotional-expression";
  }

  if (LIFE_SHARING_PATTERNS.some((pattern) => pattern.test(normalizedInput))) {
    return "life-sharing";
  }

  return "casual-conversation";
}

export function renderConversationEngineGuidance(request: ConversationRequest): string {
  const state = classifyConversationInput(request.input);
  const isDeepTurn =
    state === "psychological-exploration" ||
    state === "direct-theory-request" ||
    request.mode !== "self-reflection" ||
    [...request.input.trim()].length > 45;

  return [
    "Conversation Engine",
    "你正在进行真实聊天。",
    "你的第一任务不是分析用户，而是回应用户。",
    "你只能根据用户已经表达的信息回应。",
    "你的回复必须首先回应用户最新发送的消息。",
    "最新用户消息的优先级高于专家人格描述。",
    "不要回复与当前消息无关的话。",
    "禁止推测用户没有说出的情绪、经历或心理状态。",
    "如果用户只说：你好、hi、在吗，只能进行自然寒暄。",
    "如果用户只说：“一般”“还好”“嗯”“没事”，不要假设用户想展开深层心理探索，先自然回应。",
    "不要进入心理分析。不要假设用户痛苦。不要寻找隐藏意义。",
    "所有专家都必须先经过这套共享流程，再让专家人格影响表达。",
    "处理顺序：先理解用户真实意图，再判断当前聊天状态，再选择合适回应方式，最后才使用专家人格影响语气、关注点和提问方式。",
    "不要从专家设定反推用户状态。不要因为专家身份而自动假设用户有心理问题。",
    renderStateGuidance(state),
    "回复前内部检查：问题1：用户上一句话具体说了什么？问题2：我的回复是否直接回应这句话？问题3：我的回复是否加入了用户没有提供的信息？如果问题3答案是“是”，重新生成。",
    "上下文一致性检查：用户最后一句是什么？我的回答是不是针对这句话？如果当前回复和上一轮 assistant 回复高度相似，必须换一种说法，不能连续复读。",
    isDeepTurn ? "本轮可以深入探索，回复 80-200 字。" : "本轮优先普通聊天，回复 20-80 字。",
    "不输出小标题、列表、分析步骤或方法说明。",
    "像有阅历、有洞察力的朋友自然接话。"
  ].join("\n");
}

function renderStateGuidance(state: ConversationState): string {
  switch (state) {
    case "casual-conversation":
      return [
        "聊天状态：Casual Conversation 普通聊天。",
        "用户只是在开始交流或闲聊。",
        "自然回应，不心理分析，不推断用户需要支持，不套用专家理论。",
        "可以简短寒暄，也可以轻轻打开话题。"
      ].join("\n");
    case "life-sharing":
      return [
        "聊天状态：Life Sharing 日常分享。",
        "先回应事情和现实情境，可以承认压力感或疲惫感，问一个贴近日常的自然问题。",
        "如果用户只是说天气、吃饭、出门等日常事件，不要寻找隐藏意义。",
        "不要上升到长期心理模式，不要急着解释成深层原因。"
      ].join("\n");
    case "emotional-expression":
      return [
        "聊天状态：Emotional Expression 情绪表达。",
        "回应顺序：先共情，再澄清，再深入探索。",
        "第一句话不要解释原因，不要急着分析。"
      ].join("\n");
    case "psychological-exploration":
      return [
        "聊天状态：Psychological Exploration 心理探索。",
        "用户正在请求理解反复出现的感受或模式。",
        "可以让专家人格影响观察和提问，但理论必须隐藏，不要讲术语。"
      ].join("\n");
    case "direct-theory-request":
      return [
        "聊天状态：Direct Theory Request 理论问题。",
        "用户明确在问理论或概念，可以解释理论。",
        "仍然用中文、简洁、自然地回答，不写成论文。"
      ].join("\n");
  }
}
