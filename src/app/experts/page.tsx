import Link from "next/link";

import { ExpertCard } from "@/components/expert/expert-card";
import { EXPERTS } from "@/domain/experts/registry";

export default function ExpertsPage() {
  return (
    <main className="page-shell">
      <section aria-labelledby="experts-title" className="page-hero">
        <p className="eyebrow">Seven historical psychology voices</p>
        <h1 id="experts-title">Choose an expert persona</h1>
        <p className="lead">
          This is an educational role simulation for psychology study and reflective
          discussion. It is not diagnosis, treatment, or a licensed clinical service.
        </p>
        <Link className="back-link" href="/">
          Back home
        </Link>
      </section>

      <section aria-label="Expert personas" className="expert-grid">
        {EXPERTS.map((expert) => (
          <ExpertCard expert={expert} key={expert.slug} />
        ))}
      </section>
    </main>
  );
}
