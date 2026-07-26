import { ExpertCard } from "@/components/expert/expert-card";
import { FIGMA_HOME_ORDER } from "@/components/expert/display-copy";
import { PaintingRoomLayout } from "@/components/layout/painting-room-layout";
import { EXPERTS } from "@/domain/experts/registry";

export default function Home() {
  const expertsBySlug = new Map(EXPERTS.map((expert) => [expert.slug, expert]));
  const experts = FIGMA_HOME_ORDER.map((slug) => expertsBySlug.get(slug)).filter(Boolean);

  return (
    <PaintingRoomLayout
      aria-labelledby="home-title"
      className="home-oil-room"
      includeLamp
      includePlant
      tag="main"
      variant="home"
    >
      <section className="oil-brand home-brand">
        <h1 id="home-title">Talk to me</h1>
        <span className="brand-rule" aria-hidden="true" />
        <p>对话过去的声音，靠近此刻的自己</p>
      </section>

      <section aria-label="选择一位历史心理学家" className="home-expert-list">
        {experts.map((expert) => (
          <ExpertCard expert={expert} key={expert.slug} />
        ))}
      </section>

      <p className="home-safety-note">
        本工具为基于历史人物思想风格的教育性角色模拟，不提供诊断、治疗或临床服务。
      </p>
    </PaintingRoomLayout>
  );
}
