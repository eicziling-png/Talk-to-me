import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8").replace(/\s+/g, " ");

describe("Chat responsive layout", () => {
  it("keeps the chat panel in a dedicated column before the layout becomes narrow", () => {
    expect(stylesheet).toContain(
      "@media (max-width: 1100px) { .figma-chatpage { display: grid; grid-template-columns: minmax(0, 42%) minmax(0, 58%);"
    );
    expect(stylesheet).toContain(
      ".figma-chatpage__art { position: relative; grid-column: 1; grid-row: 1;"
    );
    expect(stylesheet).toContain(
      ".figma-chatpage .chat-room-panel { position: relative; grid-column: 2; grid-row: 1; inset: auto; width: auto;"
    );
  });

  it("moves the artwork above a full-width chat panel on phone-width viewports", () => {
    expect(stylesheet).toContain(
      "@media (max-width: 700px) { .figma-chatpage { grid-template-columns: 1fr; grid-template-rows: minmax(240px, 42svh) minmax(0, 1fr);"
    );
    expect(stylesheet).toContain(
      ".figma-chatpage .chat-room-panel { grid-column: 1; grid-row: 2; width: 100%; height: auto;"
    );
    expect(stylesheet).toContain(
      ".figma-chatpage .chat-room-conversation, .figma-chatpage .chat-composer-slot, .figma-chatpage .chat-composer { min-width: 0; }"
    );
  });
});
