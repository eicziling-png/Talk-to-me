import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import type { BrowserSession } from "@/domain/conversation/browser-session";
import { toMarkdown, toPlainText } from "@/domain/conversation/export";

const session: BrowserSession = {
  expertName: "Donald Winnicott",
  expertSlug: "winnicott",
  mode: "self-reflection",
  messages: [
    { id: "u1", role: "user", content: "I feel false around people." },
    { id: "a1", role: "assistant", content: "Let us think about aliveness.", complete: true }
  ],
  summary: null,
  status: "idle",
  safetyLevel: "S0"
};

describe("conversation export", () => {
  it("includes expert and mode metadata plus transcript content", () => {
    const markdown = toMarkdown(session);
    const plainText = toPlainText(session);

    expect(markdown).toContain("# Conversation with Donald Winnicott");
    expect(markdown).toContain("Mode: self-reflection");
    expect(markdown).toContain("我: I feel false around people.");
    expect(markdown).toContain("Donald Winnicott: Let us think about aliveness.");

    expect(plainText).toContain("Conversation with Donald Winnicott");
    expect(plainText).toContain("Mode: self-reflection");
    expect(plainText).toContain("我: I feel false around people.");
  });

  it("does not export internal prompt, safety, or provider metadata", () => {
    const markdown = toMarkdown({
      ...session,
      summary: { content: "private summary should not export" },
      safetyLevel: "S3"
    });

    expect(markdown).not.toContain("system");
    expect(markdown).not.toContain("prompt");
    expect(markdown).not.toContain("SafetyLevel");
    expect(markdown).not.toContain("S3");
    expect(markdown).not.toContain("provider");
    expect(markdown).not.toContain("private summary");
  });

  it("does not use browser persistence APIs in chat or conversation code", () => {
    const roots = ["src/components/chat", "src/domain/conversation", "src/app/chat"];
    const forbidden = ["localStorage", "sessionStorage", "indexedDB"];
    const scanned = roots.flatMap((root) => listFiles(root));

    expect(scanned.length).toBeGreaterThan(0);

    for (const file of scanned) {
      const content = readFileSync(file, "utf8");
      for (const term of forbidden) {
        expect(content, `${file} contains ${term}`).not.toContain(term);
      }
    }
  });
});

function listFiles(path: string): string[] {
  try {
    const stat = statSync(path);
    if (stat.isFile()) {
      return [path];
    }

    return readdirSync(path).flatMap((entry) => listFiles(join(path, entry)));
  } catch {
    return [];
  }
}
