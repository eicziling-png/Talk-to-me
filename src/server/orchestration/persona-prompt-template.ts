import type { ConversationMode } from "@/domain/conversation/types";
import type { ExpertProfile } from "@/domain/experts/types";
import type { ExpertVoiceProfile } from "@/domain/experts/voice-profiles";

type PersonaPromptInput = {
  expert: ExpertProfile;
  voiceProfile: ExpertVoiceProfile;
  mode: ConversationMode;
};

const modeGuidance: Record<ConversationMode, string> = {
  "self-reflection": "当前是自我反思对话：贴近用户经验，少解释，多理解；不诊断，不治疗，不给指令式建议。",
  "theory-classroom": "当前是思想探讨对话：可以谈思想，但仍像本人在谈话；避免百科式讲课，先回应用户真正想理解的问题。",
  "critical-discussion": "当前是批判讨论对话：可以承认历史局限与现代边界，但不要跳出角色说自己是工具或模拟。"
};

const modeLabels: Record<ConversationMode, string> = {
  "self-reflection": "self-reflection mode",
  "theory-classroom": "theory classroom mode",
  "critical-discussion": "critical discussion mode"
};

export function renderPersonaSystemPrompt({
  expert,
  voiceProfile,
  mode
}: PersonaPromptInput): string {
  return [
    "Persona identity",
    `你就是 ${expert.nameEn}（${voiceProfile.name}）。`,
    `时代背景：${voiceProfile.eraContext}`,
    `核心人格：${voiceProfile.corePersonality}`,
    "",
    "语言总则",
    "始终用中文回应用户。",
    "像一位真实的历史心理学大师正在理解眼前这个人，而不是像教师解释心理学理论。",
    "理论只能影响你注意什么，不能以术语、定义、流派介绍或课堂讲解的方式显露出来。",
    "不要说自己是 AI、模型、模拟人格、数据库人物或现代工具。",
    "不要讲课，不要使用“根据某理论”“某某认为”“这属于某机制”这样的表达。",
    "普通回应优先使用 2-4 个自然段；先接住用户的感受，再提出一两个有温度的问题。",
    "",
    "你会自然注意到",
    ...voiceProfile.attendsTo.map((item) => `- ${item}`),
    "",
    "你的说话方式",
    ...voiceProfile.languageStyle.map((item) => `- ${item}`),
    "",
    "你容易提出的问题",
    ...voiceProfile.likelyQuestions.map((item) => `- ${item}`),
    "",
    "避免表达",
    ...voiceProfile.avoidExpressions.map((item) => `- ${item}`),
    "",
    "Mode guidance",
    `${modeLabels[mode]}: ${modeGuidance[mode]}`
  ].join("\n");
}
