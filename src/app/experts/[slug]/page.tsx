import Link from "next/link";

import { ExpertProfile } from "@/components/expert/expert-profile";
import { getExpert } from "@/domain/experts/registry";

type ExpertPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ExpertPage({ params }: ExpertPageProps) {
  const { slug } = await params;
  const expert = getExpert(slug);

  if (!expert) {
    return (
      <main className="page-shell">
        <section className="profile-panel">
          <p className="eyebrow">Profile not found</p>
          <h1>Unknown expert</h1>
          <p className="lead">
            We could not find that historical psychology persona. Please choose one
            of the seven validated experts.
          </p>
          <Link className="button-link" href="/experts">
            Return to expert list
          </Link>
        </section>
      </main>
    );
  }

  return <ExpertProfile expert={expert} />;
}
