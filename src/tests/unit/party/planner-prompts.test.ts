import { describe, expect, it } from "vitest";

import { buildConversationArrangementMessages } from "@/server/party/build-planner-messages";

describe("conversation arrangement planner prompt", () => {
  it("puts safety and arrangement rules before delimited user data", () => {
    const messages = buildConversationArrangementMessages({
      mode: "self-reflection",
      input: "我只是想随便聊聊，不要替我分析。",
      history: []
    });
    const content = messages.map((message) => message.content).join("\n");

    expect(content.indexOf("Safety instructions")).toBeGreaterThanOrEqual(0);
    expect(content).toContain("Conversation arrangement planner");
    expect(content).toContain("<user_input>");
    expect(content).toContain("</user_input>");
    expect(content).toContain("freud");
    expect(content).toContain("yalom");
    expect(content).not.toContain("向用户输出回复");
  });
});
