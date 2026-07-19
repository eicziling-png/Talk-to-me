import Link from "next/link";

import type { ExpertProfile } from "@/domain/experts/types";

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
        <h2>{expert.nameEn}</h2>
        <p className="expert-name-zh">{expert.nameZh}</p>
        <p className="expert-era">{expert.era}</p>

        <section aria-labelledby={`${expert.slug}-style-title`} className="card-style">
          <h3 id={`${expert.slug}-style-title`}>风格</h3>
          <ul className="detail-list">
            {expert.style.map((style) => (
              <li key={style}>{style}</li>
            ))}
          </ul>
        </section>

        <Link className="button-link" href={`/chat/${expert.slug}`}>
          开始对话
        </Link>
      </div>
    </article>
  );
}
