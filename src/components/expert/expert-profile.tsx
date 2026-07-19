import Link from "next/link";

import type { ExpertProfile as ExpertProfileType } from "@/domain/experts/types";

import { ConversationStart } from "./conversation-start";
import { schoolLabels } from "./school-labels";

type ExpertProfileProps = {
  expert: ExpertProfileType;
};

export function ExpertProfile({ expert }: ExpertProfileProps) {
  return (
    <main className="page-shell">
      <div className="link-row">
        <Link className="back-link" href="/experts">
          返回专家列表
        </Link>
        <Link className="back-link" href="/about">
          安全与隐私说明
        </Link>
      </div>
      <article className="profile-panel">
        <header className="profile-header">
          <div className="portrait-placeholder portrait-large" aria-hidden="true">
            {expert.nameEn
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <p className="eyebrow">{schoolLabels[expert.school] ?? expert.school}</p>
            <h1>{expert.nameEn}</h1>
            <p className="expert-name-zh">{expert.nameZh}</p>
            <p className="lead">{expert.era}</p>
          </div>
        </header>

        <section aria-labelledby="style-title" className="profile-section">
          <h2 id="style-title">风格</h2>
          <ul className="detail-list">
            {expert.style.map((style) => (
              <li key={style}>{style}</li>
            ))}
          </ul>
        </section>
      </article>

      <ConversationStart expertSlug={expert.slug} />
    </main>
  );
}
