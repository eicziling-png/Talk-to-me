import Link from "next/link";

import type { ExpertSlug } from "@/domain/experts/types";

type ConversationStartProps = {
  expertSlug: ExpertSlug;
};

export function ConversationStart({ expertSlug }: ConversationStartProps) {
  return (
    <section aria-labelledby="conversation-start-title" className="conversation-start">
      <div>
        <h2 id="conversation-start-title">开始对话</h2>
        <p className="section-copy">
          这是基于历史人物思想风格的教育性角色模拟，不提供诊断或治疗服务。
        </p>
      </div>
      <Link className="button-link conversation-button" href={`/chat/${expertSlug}`}>
        开始对话
      </Link>
    </section>
  );
}
