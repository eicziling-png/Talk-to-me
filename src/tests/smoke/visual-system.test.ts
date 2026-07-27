import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("oil-paint spatial visual system", () => {
  it("uses the final Figma color vocabulary", () => {
    expect(css).toContain("--paper: #f3efe3");
    expect(css).toContain("--ink: #182b4d");
    expect(css).toContain("--accent: #233b6e");
    expect(css).toContain("--gold: #dbb46a");
    expect(css).toContain("--cool-blue: #1e63b7");
    expect(css).toContain("--plant: #4d7a42");
  });

  it("keeps the spatial split and threshold motifs", () => {
    expect(css).toContain(".oil-plane-blue");
    expect(css).toContain(".oil-plane-threshold");
    expect(css).toContain(".oil-plane-light-seam");
    expect(css).toContain(".oil-plane-warm");
    expect(css).toContain(".oil-plane-floor-brown");
  });

  it("uses one shared viewport layout with state-specific room ratios", () => {
    expect(css).toContain(".painting-room-layout");
    expect(css).toContain("width: 100vw");
    expect(css).toContain("min-height: 100vh");
    expect(css).toContain("--room-blue: 57%");
    expect(css).toContain("--room-warm: 43%");
    expect(css).toContain("--room-blue: 43%");
    expect(css).toContain("--room-warm: 57%");
    expect(css).not.toContain("width: 38%");
    expect(css).not.toContain("left: 38%");
    expect(css).not.toContain("width: 62%");
  });

  it("structures chat as header, conversation, and composer zones", () => {
    expect(css).toContain(".chat-room-panel");
    expect(css).toContain("display: flex");
    expect(css).toContain("flex-direction: column");
    expect(css).toContain(".chat-room-conversation");
    expect(css).toContain("overflow-y: auto");
    expect(css).toContain("scrollbar-gutter: stable");
    expect(css).toContain(".chat-composer-slot");
    expect(css).toContain("flex: 0 0 calc(20vh - var(--chat-panel-bottom) + 36px)");
    expect(css).toContain("justify-content: flex-end");
    expect(css).toContain("flex: 0 0 127px");
    expect(css).toContain("padding: clamp(22px, 3.2vh, 30px) 0 36px");
  });

  it("uses meaningful painterly light, not SaaS surface effects", () => {
    expect(css).toMatch(/linear-gradient|radial-gradient/i);
    expect(css).not.toMatch(/backdrop-filter|glassmorphism|neon/i);
    expect(css).not.toMatch(/#[fF]{3}(?:[fF]{3})?\b/);
  });
});
