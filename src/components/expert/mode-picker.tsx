import Link from "next/link";

import { CONVERSATION_MODES } from "@/domain/conversation/schema";
import type { ConversationMode } from "@/domain/conversation/types";
import type { ExpertSlug } from "@/domain/experts/types";

const modeCopy: Record<ConversationMode, { title: string; description: string }> = {
  "self-reflection": {
    title: "Self-reflection",
    description:
      "Slow down with the persona's lens while staying outside diagnosis or treatment."
  },
  "theory-classroom": {
    title: "Theory classroom",
    description:
      "Ask for concepts, comparisons, and historically grounded explanations."
  },
  "critical-discussion": {
    title: "Critical discussion",
    description:
      "Explore limits, critiques, and modern context without treating the persona as a clinician."
  }
};

type ModePickerProps = {
  expertSlug: ExpertSlug;
};

export function ModePicker({ expertSlug }: ModePickerProps) {
  return (
    <section aria-labelledby="mode-picker-title" className="mode-picker">
      <div>
        <p className="eyebrow">Choose a mode</p>
        <h2 id="mode-picker-title">Start a conversation</h2>
        <p className="section-copy">
          These are educational role simulations, not diagnosis, therapy, or emergency support.
        </p>
      </div>
      <div className="mode-grid">
        {CONVERSATION_MODES.map((mode) => (
          <Link
            className="mode-card"
            href={`/chat/${expertSlug}?mode=${mode}`}
            key={mode}
          >
            <span className="mode-title">
              {modeCopy[mode].title} <span className="mode-slug">({mode})</span>
            </span>
            <span>{modeCopy[mode].description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
