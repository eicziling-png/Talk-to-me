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
    ...session.messages.map(formatMarkdownMessage)
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
    ...session.messages.map(formatPlainMessage)
  ].join("\n");
}

function formatMarkdownMessage(message: BrowserMessage): string {
  const label = message.role === "user" ? "User" : "Assistant";
  const suffix = message.role === "assistant" && message.complete === false ? " _(incomplete)_" : "";

  return `${label}: ${message.content}${suffix}`;
}

function formatPlainMessage(message: BrowserMessage): string {
  const label = message.role === "user" ? "User" : "Assistant";
  const suffix = message.role === "assistant" && message.complete === false ? " (incomplete)" : "";

  return `${label}: ${message.content}${suffix}`;
}
