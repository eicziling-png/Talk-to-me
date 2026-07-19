import { describe, expect, it } from "vitest";

import {
  classifyConversationInput,
  renderConversationEngineGuidance
} from "@/server/orchestration/conversation-engine";
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

  it("keeps every expert in casual mode for greetings", () => {
    for (const expert of EXPERTS) {
      expect(classifyConversationInput("你好")).toBe("casual-conversation");

      const guidance = renderConversationEngineGuidance({
        expertSlug: expert.slug,
        mode: "self-reflection",
        input: "你好",
        history: []
      });

      expect(guidance).toContain("聊天状态：Casual Conversation 普通聊天");
      expect(guidance).toContain("只能进行自然寒暄");
      expect(guidance).not.toContain("聊天状态：Emotional Expression 情绪表达");
      expect(guidance).not.toContain("聊天状态：Psychological Exploration 心理探索");
    }
  });

  it("keeps rain small talk out of symbolic analysis", () => {
    expect(classifyConversationInput("今天下雨了。")).toBe("life-sharing");

    const guidance = renderConversationEngineGuidance(makeRequest("今天下雨了。"));

    expect(guidance).toContain("聊天状态：Life Sharing 日常分享");
    expect(guidance).toContain("先回应事情");
    expect(guidance).toContain("不要寻找隐藏意义");
  });

  it("treats work stress as emotional support without jumping into deep analysis", () => {
    expect(classifyConversationInput("最近工作压力很大。")).toBe("life-sharing");

    const guidance = renderConversationEngineGuidance(makeRequest("最近工作压力很大。"));

    expect(guidance).toContain("先回应事情");
    expect(guidance).toContain("可以承认压力感");
    expect(guidance).toContain("不要急着解释成深层原因");
  });
});
