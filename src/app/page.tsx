import { ExpertCard } from "@/components/expert/expert-card";
import { EXPERTS } from "@/domain/experts/registry";

export default function Home() {
  return (
    <main className="home-shell">
      <section aria-labelledby="home-title" className="home-panel">
        <p className="eyebrow">历史心理学家对话</p>
        <h1 id="home-title">与历史心理学家对话</h1>
        <p className="lead">
          选择一位你想认识的心理学家，像聊天一样进入他的思想方式。这里适合学习、
          反思和轻量探索，不需要先阅读复杂理论。
        </p>
      </section>

      <section aria-label="专家卡片" className="expert-grid home-expert-grid">
        {EXPERTS.map((expert) => (
          <ExpertCard expert={expert} key={expert.slug} />
        ))}
      </section>

      <p className="home-safety-note">
        本工具为基于历史人物思想风格的教育性角色模拟，不提供诊断、治疗或临床服务。
      </p>
    </main>
  );
}
