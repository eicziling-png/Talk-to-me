import Link from "next/link";

import type { ExpertProfile } from "@/domain/experts/types";

import { EXPERT_DISPLAY_COPY } from "./display-copy";

type ExpertCardProps = {
  expert: ExpertProfile;
};

export function ExpertCard({ expert }: ExpertCardProps) {
  const display = EXPERT_DISPLAY_COPY[expert.slug];

  return (
    <article aria-label={`${expert.nameZh}，${expert.era}`} className="expert-card" data-expert={expert.slug}>
      <Link aria-label={`开始与${expert.nameZh}对话`} className="expert-card-link" href={`/chat/${expert.slug}`}>
        <span className="expert-card-meta">
          {expert.nameZh} · {expert.era}
        </span>
        <span className="expert-card-poetic">{display.poeticLine}</span>
      </Link>
    </article>
  );
}
