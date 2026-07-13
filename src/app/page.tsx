import Link from "next/link";

import { EducationalNotice } from "@/components/safety/educational-notice";

const expertNames = [
  "Sigmund Freud",
  "Carl Jung",
  "Wilfred Bion",
  "Melanie Klein",
  "Donald Winnicott",
  "Heinz Kohut",
  "Irvin Yalom"
];

export default function Home() {
  return (
    <main className="home-shell">
      <section aria-labelledby="home-title" className="home-panel">
        <p className="eyebrow">Historical psychology dialogue lab</p>
        <h1 id="home-title">与历史心理学家对话</h1>
        <p className="lead">
          本工具仅用于心理学教育和角色模拟，帮助你以安全、清晰的方式理解不同心理学流派的语言、概念和思考路径。
        </p>
        <EducationalNotice compact />
        <ul aria-label="内置专家" className="expert-list">
          {expertNames.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        <Link className="button-link home-cta" href="/experts">
          探索七位专家人格
        </Link>
      </section>
    </main>
  );
}
