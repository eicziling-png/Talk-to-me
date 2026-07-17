import { describe, expect, it } from "vitest";

import {
  classifyConversationInput,
  renderConversationEngineGuidance
} from "@/server/orchestration/conversation-engine";
import type { ConversationRequest } from "@/domain/conversation/types";

function makeRequest(input: string): ConversationRequest {
  return {
    expertSlug: "winnicott",
    mode: "self-reflection",
    input,
    history: []
  };
}

describe("conversation engine", () => {
  it("classifies greetings as casual conversation without psychological inference", () => {
    expect(classifyConversationInput("你好")).toBe("casual-conversation");

    const guidance = renderConversationEngineGuidance(makeRequest("你好"));

    expect(guidance).toContain("聊天状态：Casual Conversation 普通聊天");
    expect(guidance).toContain("不心理分析");
    expect(guidance).toContain("不推断用户需要支持");
    expect(guidance).toContain("不要从专家设定反推用户状态");
  });

  it("classifies daily events as life sharing and keeps replies grounded in the event", () => {
    expect(classifyConversationInput("今天工作好累。")).toBe("life-sharing");

    const guidance = renderConversationEngineGuidance(makeRequest("今天工作好累。"));

    expect(guidance).toContain("聊天状态：Life Sharing 日常分享");
    expect(guidance).toContain("先回应事情");
    expect(guidance).toContain("不要上升到长期心理模式");
  });

  it("classifies direct distress as emotional expression with empathy first", () => {
    expect(classifyConversationInput("我觉得自己很失败。")).toBe("emotional-expression");

    const guidance = renderConversationEngineGuidance(makeRequest("我觉得自己很失败。"));

    expect(guidance).toContain("聊天状态：Emotional Expression 情绪表达");
    expect(guidance).toContain("先共情");
    expect(guidance).toContain("第一句话不要解释原因");
  });

  it("classifies why-pattern questions as psychological exploration", () => {
    expect(classifyConversationInput("为什么我总害怕失败？")).toBe(
      "psychological-exploration"
    );

    const guidance = renderConversationEngineGuidance(makeRequest("为什么我总害怕失败？"));

    expect(guidance).toContain("聊天状态：Psychological Exploration 心理探索");
    expect(guidance).toContain("理论必须隐藏");
  });

  it("classifies explicit theory questions as direct theory requests", () => {
    expect(classifyConversationInput("什么是荣格的集体无意识？")).toBe(
      "direct-theory-request"
    );

    const guidance = renderConversationEngineGuidance(
      makeRequest("什么是荣格的集体无意识？")
    );

    expect(guidance).toContain("聊天状态：Direct Theory Request 理论问题");
    expect(guidance).toContain("可以解释理论");
  });
});
