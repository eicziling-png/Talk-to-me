import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8").replace(/\s+/g, " ");

describe("Homepage typography restoration", () => {
  it("uses the compact legacy title and expert-list scale", () => {
    expect(stylesheet).toContain(
      ".figma-homepage .figma-homepage__intro h1 { font-size: clamp(3rem, 4vw, 3.5rem); }"
    );
    expect(stylesheet).toContain(
      ".figma-homepage .figma-homepage__intro p { font-size: clamp(1rem, 1.667vw, 1.5rem); }"
    );
    expect(stylesheet).toContain(
      ".figma-homepage .figma-homepage__expert { gap: 0.75rem; font-size: clamp(1rem, 1.667vw, 1.5rem); }"
    );
    expect(stylesheet).toContain(
      ".figma-homepage .figma-homepage__dot { width: 0.65rem; height: 0.6rem; }"
    );
    expect(stylesheet).toContain(".figma-homepage .home-expert-list { top: 29.25%; }");
  });
});
