import { ExpertCard } from "@/components/expert/expert-card";
import { EXPERTS } from "@/domain/experts/registry";

export default function Home() {
  return (
    <main className="home-shell thought-room">
      <section aria-labelledby="home-title" className="home-panel">
        <h1 id="home-title">Talk to me</h1>
        <p className="lead">对话过去的声音，靠近此刻的自己</p>
      </section>

      <section aria-label="专家卡片" className="expert-grid home-expert-list">
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
