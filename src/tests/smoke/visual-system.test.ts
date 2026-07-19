import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("quiet humanistic visual system", () => {
  it("uses the warm gallery color tokens from the visual direction", () => {
    expect(css).toContain("--color-bg: #f3efe3");
    expect(css).toContain("--color-text: #182b4d");
    expect(css).toContain("--color-accent: #233b6e");
    expect(css).toContain("--color-sand: #dccfa8");
    expect(css).toContain("--color-cool-blue: #1e63b7");
    expect(css).toContain("--color-warm-light: #f4d27d");
    expect(css).toContain("--chat-expert-bubble: #fbf6ea");
    expect(css).toContain("--chat-user-bubble: #dce4ea");
  });

  it("avoids SaaS-style visual effects in the core stylesheet", () => {
    expect(css).not.toMatch(/linear-gradient|radial-gradient|backdrop-filter/i);
    expect(css).not.toMatch(/#[fF]{3}(?:[fF]{3})?\b/);
  });

  it("includes the quiet room spatial motif without changing app logic", () => {
    expect(css).toContain(".home-shell.thought-room::before");
    expect(css).toContain(".home-panel::before");
    expect(css).toContain(".chat-workspace::before");
  });
});
