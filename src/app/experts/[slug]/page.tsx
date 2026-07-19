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
          <p className="eyebrow">未找到资料</p>
          <h1>没有找到这位专家</h1>
          <p className="lead">请返回专家列表，选择目前已经整理好的七位心理学大师。</p>
          <Link className="button-link" href="/experts">
            返回专家列表
          </Link>
        </section>
      </main>
    );
  }

  return <ExpertProfile expert={expert} />;
}
