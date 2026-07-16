"use client";

import type { BrowserSession } from "@/domain/conversation/browser-session";
import { toMarkdown } from "@/domain/conversation/export";

type ExportButtonProps = {
  session: BrowserSession;
};

export function ExportButton({ session }: ExportButtonProps) {
  return (
    <button disabled={session.messages.length === 0} onClick={() => downloadMarkdown(session)} type="button">
      导出
    </button>
  );
}

function downloadMarkdown(session: BrowserSession): void {
  const blob = new Blob([toMarkdown(session)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${session.expertSlug}-${session.mode}-conversation.md`;
  link.click();
  URL.revokeObjectURL(url);
}
