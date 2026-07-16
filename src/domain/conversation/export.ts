import type { BrowserMessage, BrowserSession } from "./browser-session";

export function toMarkdown(session: BrowserSession): string {
  return [
    `# Conversation with ${session.expertName}`,
    "",
    `Expert: ${session.expertName}`,
    `Mode: ${session.mode}`,
    "",
    "## Transcript",
    "",
    ...session.messages.map((message) => formatMarkdownMessage(message, session.expertName))
  ].join("\n");
}

export function toPlainText(session: BrowserSession): string {
  return [
    `Conversation with ${session.expertName}`,
    `Expert: ${session.expertName}`,
    `Mode: ${session.mode}`,
    "",
    "Transcript",
    "",
    ...session.messages.map((message) => formatPlainMessage(message, session.expertName))
  ].join("\n");
}

function formatMarkdownMessage(message: BrowserMessage, expertName: string): string {
  const label = message.role === "user" ? "我" : expertName;
  const suffix = message.role === "assistant" && message.complete === false ? " _（消息中断）_" : "";

  return `${label}: ${message.content}${suffix}`;
}

function formatPlainMessage(message: BrowserMessage, expertName: string): string {
  const label = message.role === "user" ? "我" : expertName;
  const suffix = message.role === "assistant" && message.complete === false ? "（消息中断）" : "";

  return `${label}: ${message.content}${suffix}`;
}
