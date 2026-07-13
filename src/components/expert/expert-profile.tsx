import Link from "next/link";

import type { ExpertProfile as ExpertProfileType } from "@/domain/experts/types";

import { ModePicker } from "./mode-picker";

type ExpertProfileProps = {
  expert: ExpertProfileType;
};

export function ExpertProfile({ expert }: ExpertProfileProps) {
  return (
    <main className="page-shell">
      <div className="link-row">
        <Link className="back-link" href="/experts">
          Return to expert list
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
            <p className="eyebrow">{expert.school}</p>
            <h1>{expert.nameEn}</h1>
            <p className="expert-name-zh">{expert.nameZh}</p>
            <p className="lead">{expert.era}</p>
          </div>
        </header>

        <section aria-labelledby="theories-title" className="profile-section">
          <h2 id="theories-title">Hallmark concepts</h2>
          <ul className="detail-list">
            {expert.coreTheories.map((theory) => (
              <li key={theory}>{theory}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="style-title" className="profile-section">
          <h2 id="style-title">Voice and style</h2>
          <ul className="detail-list">
            {expert.style.map((style) => (
              <li key={style}>{style}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="starter-title" className="profile-section">
          <h2 id="starter-title">Starter questions</h2>
          <ul className="detail-list">
            {expert.starterQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>
      </article>

      <ModePicker expertSlug={expert.slug} />
    </main>
  );
}
