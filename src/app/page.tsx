import Link from "next/link";

import { FIGMA_HOME_ORDER } from "@/components/expert/display-copy";
import { EXPERTS } from "@/domain/experts/registry";
import type { ExpertSlug } from "@/domain/experts/types";

const FIGMA_EXPERT_NAMES: Record<ExpertSlug, string> = {
  freud: "弗洛伊德",
  lacan: "拉康",
  klein: "克莱因",
  kohut: "科胡特",
  winnicott: "温尼科特",
  yalom: "欧文亚隆",
  bion: "比昂"
};

const expertsBySlug = new Map(EXPERTS.map((expert) => [expert.slug, expert]));
const orderedExperts = FIGMA_HOME_ORDER.map((slug) => ({
  expert: expertsBySlug.get(slug),
  name: FIGMA_EXPERT_NAMES[slug],
  slug
})).filter((entry): entry is { expert: (typeof EXPERTS)[number]; name: string; slug: ExpertSlug } => Boolean(entry.expert));

const leftColumn = orderedExperts.filter(({ slug }) =>
  ["freud", "klein", "winnicott", "bion"].includes(slug)
);
const rightColumn = orderedExperts.filter(({ slug }) =>
  ["lacan", "kohut", "yalom"].includes(slug)
);

function ExpertName({ name, slug, column }: { name: string; slug: ExpertSlug; column: "left" | "right" }) {
  return (
    <Link
      aria-label={`开始与${name}对话`}
      className={`figma-homepage__expert figma-homepage__expert--${column}`}
      href={`/chat/${slug}`}
    >
      <img
        alt=""
        aria-hidden="true"
        className="figma-homepage__dot"
        src={column === "left" ? "/figma/dot-a.svg" : "/figma/dot-b.svg"}
      />
      <span>{name}</span>
    </Link>
  );
}

export default function Home() {
  return (
    <main aria-labelledby="home-title" className="figma-homepage">
      <img
        alt=""
        aria-hidden="true"
        className="figma-homepage__art"
        src="/figma/talk-to-me-homepage.png"
      />

      <section className="figma-homepage__intro">
        <h1 id="home-title">TALK TO ME</h1>
        <p>对话过去的声音，靠近此刻的自己</p>
      </section>

      <nav aria-label="选择一位历史心理学家" className="figma-homepage__experts home-expert-list">
        <div className="figma-homepage__expert-column">
          {leftColumn.map(({ name, slug }) => (
            <ExpertName column="left" key={slug} name={name} slug={slug} />
          ))}
        </div>
        <div className="figma-homepage__expert-column">
          {rightColumn.map(({ name, slug }) => (
            <ExpertName column="right" key={slug} name={name} slug={slug} />
          ))}
        </div>
      </nav>

      <div className="figma-homepage__safety home-safety-note">
        <p>
          本工具为基于历史人物思想风格的角色模拟。
          <br />
          不提供诊断、治疗或临床服务。
        </p>
        <Link href="/about">安全与隐私说明</Link>
      </div>
    </main>
  );
}
