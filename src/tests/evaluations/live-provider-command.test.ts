import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("live provider evaluation command", () => {
  it("uses a dedicated opt-in harness rather than the deterministic test runner", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8")
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["eval:live"]).toContain(
      "src/tests/evaluations/live-provider-sampling.test.ts"
    );
  });
});
