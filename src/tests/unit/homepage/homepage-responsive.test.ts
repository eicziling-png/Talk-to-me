import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8").replace(/\s+/g, " ");

describe("Homepage responsive layout", () => {
  it("reserves a dedicated text column before the desktop layout becomes narrow", () => {
    expect(stylesheet).toContain(
      "@media (max-width: 1100px) { .figma-homepage { display: grid; grid-template-columns: minmax(0, 42%) minmax(0, 58%);"
    );
    expect(stylesheet).toContain(
      ".figma-homepage__art { position: relative; grid-column: 1; grid-row: 1 / -1;"
    );
    expect(stylesheet).toContain(
      ".figma-homepage__intro { position: relative; grid-column: 2; grid-row: 1; top: auto; left: auto; width: auto;"
    );
    expect(stylesheet).toContain(
      ".figma-homepage .home-expert-list { position: relative; grid-column: 2; grid-row: 2; top: auto; right: auto; bottom: auto; left: auto; width: auto;"
    );
  });

  it("stacks the illustration and readable text on phone-width viewports", () => {
    expect(stylesheet).toContain(
      "@media (max-width: 700px) { .figma-homepage { grid-template-columns: 1fr; grid-template-rows: minmax(240px, 42svh) auto auto auto;"
    );
    expect(stylesheet).toContain(
      ".figma-homepage .home-expert-list { grid-column: 1; grid-row: 3;"
    );
    expect(stylesheet).toContain(".figma-homepage__expert { white-space: normal; }");
  });
});
