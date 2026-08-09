import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8").replace(/\s+/g, " ");

describe("Figma chat message lanes", () => {
  it("keeps expert and user messages in separate aligned display ranges", () => {
    expect(stylesheet).toContain("--chat-message-lane-width: min(680px, 78%);");
    expect(stylesheet).toContain(
      ".figma-chatpage .chat-message.assistant .message-stack { width: var(--chat-message-lane-width); margin-right: auto; }"
    );
    expect(stylesheet).toContain(
      ".figma-chatpage .chat-message.user .message-stack { width: var(--chat-message-lane-width); margin-left: auto; }"
    );
  });
});
