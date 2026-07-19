import Link from "next/link";

import { ExpertCard } from "@/components/expert/expert-card";
import { EXPERTS } from "@/domain/experts/registry";

export default function ExpertsPage() {
  return (
    <main className="page-shell">
      <section aria-labelledby="experts-title" className="page-hero">
        <p className="eyebrow">七位历史心理学大师</p>
        <h1 id="experts-title">选择一位想聊天的专家</h1>
        <p className="lead">
          这里是基于历史人物思想风格的教育性角色模拟，适合了解心理学思想和自我探索，
          不提供诊断、治疗或临床服务。
        </p>
        <Link className="back-link" href="/">
          返回首页
        </Link>
        <Link className="back-link" href="/about">
          安全与隐私说明
        </Link>
      </section>

      <section aria-label="专家列表" className="expert-grid">
        {EXPERTS.map((expert) => (
          <ExpertCard expert={expert} key={expert.slug} />
        ))}
      </section>
    </main>
  );
}
