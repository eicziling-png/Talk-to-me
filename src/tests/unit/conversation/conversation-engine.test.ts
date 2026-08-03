import { describe, expect, it } from "vitest";

import { renderConversationEngineGuidance } from "@/server/orchestration/conversation-engine";
import type { ConversationRequest } from "@/domain/conversation/types";
import { EXPERTS } from "@/domain/experts/registry";

function makeRequest(input: string): ConversationRequest {
  return {
    expertSlug: "winnicott",
    mode: "self-reflection",
    input,
    history: []
  };
}

describe("conversation engine", () => {
  it("uses model-side semantic intent guidance instead of hardcoded classifications", () => {
    const guidance = renderConversationEngineGuidance(makeRequest("大的，梅雨季突然就下大雨"));

    expect(guidance).toContain("不要用代码关键词匹配来决定回复");
    expect(guidance).toContain("在内部理解用户想完成什么");
    expect(guidance).toContain("分享事实");
    expect(guidance).toContain("表达情绪");
    expect(guidance).toContain("请求陪伴");
    expect(guidance).toContain("提问");
    expect(guidance).toContain("开玩笑");
    expect(guidance).toContain("探索自己");
    expect(guidance).toContain("讨论观点");
    expect(guidance).not.toContain("聊天状态：");
  });

  it("marks a greeting-only first turn as a first interaction", () => {
    const guidance = renderConversationEngineGuidance(makeRequest("hi"));

    expect(guidance).toContain("当前阶段：第一次互动（简单问候）");
    expect(guidance).toContain("只用 1-2 句话");
    expect(guidance).toContain("不要把问候解释为焦虑、孤独、犹豫或心理困扰");
    expect(guidance).toContain("不要调用专家的关注重点或常见提问主动引出心理主题");
    expect(guidance).toContain("给用户自由选择聊天方向");
  });

  it("does not keep the first-interaction guard after history exists", () => {
    const guidance = renderConversationEngineGuidance({
      ...makeRequest("hi"),
      history: [{ role: "assistant", content: "你好，很高兴见到你。" }]
    });

    expect(guidance).not.toContain("当前阶段：第一次互动（简单问候）");
    expect(guidance).toContain("当前阶段：用户开始分享");
  });

  it("keeps all experts under the same latest-message and history-first rules", () => {
    for (const expert of EXPERTS) {
      const guidance = renderConversationEngineGuidance({
        expertSlug: expert.slug,
        mode: "self-reflection",
        input: "你是谁？",
        history: [
          { role: "user", content: "hi" },
          { role: "assistant", content: "你好，很高兴见到你。今天怎么样？" }
        ]
      });

      expect(guidance).toContain("当前用户消息的语义");
      expect(guidance).toContain("最近聊天上下文");
      expect(guidance).toContain("用户当前意图");
      expect(guidance).toContain("专家人格");
      expect(guidance).toContain("最近 5 轮聊天");
      expect(guidance).toContain("你是谁");
    }
  });

  it("forbids meta-thinking templates from leaking into replies", () => {
    const guidance = renderConversationEngineGuidance(makeRequest("还行 陪我聊聊吧"));

    expect(guidance).toContain("禁止输出元话语模板");
    expect(guidance).toContain("我听到了");
    expect(guidance).toContain("你刚才说的是这句话本身");
    expect(guidance).toContain("我先不多猜");
    expect(guidance).toContain("你可以从这里开始");
  });
});
