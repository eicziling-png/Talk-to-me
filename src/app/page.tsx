import Image from "next/image";

import { ExpertCard } from "@/components/expert/expert-card";
import { EXPERTS } from "@/domain/experts/registry";

export default function Home() {
  return (
    <main className="home-shell thought-room">
      <div className="home-painting-planes" aria-hidden="true">
        <span className="home-plane home-plane-blue" />
        <span className="home-plane home-plane-window" />
        <span className="home-plane home-plane-brown" />
        <span className="home-plane home-plane-light" />
        <span className="home-plane home-plane-wall" />
      </div>
      <Image
        alt=""
        aria-hidden="true"
        className="painterly-texture painterly-texture-home"
        fill
        priority
        src="/figma-assets/painterly-texture-homepage.png"
      />
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
      <div className="ambient-leaves" aria-hidden="true">
        <Image alt="" height={26} src="/figma-assets/ambient-plant-leaf-1.svg" width={80} />
        <Image alt="" height={28} src="/figma-assets/ambient-plant-leaf-2.svg" width={88} />
        <Image alt="" height={30} src="/figma-assets/ambient-plant-leaf-3.svg" width={92} />
      </div>
    </main>
  );
}
