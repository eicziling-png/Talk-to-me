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

  it("uses meaningful painterly light, not SaaS surface effects", () => {
    expect(css).toMatch(/linear-gradient|radial-gradient/i);
    expect(css).not.toMatch(/backdrop-filter|glassmorphism|neon/i);
    expect(css).not.toMatch(/#[fF]{3}(?:[fF]{3})?\b/);
  });
});
