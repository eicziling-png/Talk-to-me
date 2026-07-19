import Link from "next/link";

import type { ExpertProfile } from "@/domain/experts/types";

import { schoolLabels } from "./school-labels";

type ExpertCardProps = {
  expert: ExpertProfile;
};

export function ExpertCard({ expert }: ExpertCardProps) {
  return (
    <article aria-label={expert.nameEn} className="expert-card">
      <div className="portrait-placeholder" aria-hidden="true">
        {expert.nameEn
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)}
      </div>
      <div className="expert-card-body">
        <p className="eyebrow">{schoolLabels[expert.school] ?? expert.school}</p>
        <h2>{expert.nameEn}</h2>
        <p className="expert-name-zh">{expert.nameZh}</p>
        <p className="expert-era">{expert.era}</p>
        <Link className="button-link" href={`/experts/${expert.slug}`}>
          了解这位专家
        </Link>
      </div>
    </article>
  );
}
