import Link from "next/link";

import type { ExpertProfile } from "@/domain/experts/types";

type ExpertCardProps = {
  expert: ExpertProfile;
};

export function ExpertCard({ expert }: ExpertCardProps) {
  const concepts = expert.coreTheories.slice(0, 2);

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
        <p className="eyebrow">{expert.school}</p>
        <h2>{expert.nameEn}</h2>
        <p className="expert-name-zh">{expert.nameZh}</p>
        <p className="expert-era">{expert.era}</p>
        <ul className="concept-list" aria-label={`${expert.nameEn} hallmark concepts`}>
          {concepts.map((concept) => (
            <li key={concept}>{concept}</li>
          ))}
        </ul>
        <Link className="button-link" href={`/experts/${expert.slug}`}>
          View {expert.nameEn} profile
        </Link>
      </div>
    </article>
  );
}
