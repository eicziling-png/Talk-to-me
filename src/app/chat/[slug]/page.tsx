import Link from "next/link";

import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { CONVERSATION_MODES } from "@/domain/conversation/schema";
import type { ConversationMode } from "@/domain/conversation/types";
import { getExpert } from "@/domain/experts/registry";

type ChatPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string }>;
};

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const { slug } = await params;
  const { mode } = await searchParams;
  const expert = getExpert(slug);

  if (!expert) {
    return (
      <main className="page-shell">
        <h1>没有找到这位专家</h1>
        <Link className="button-link" href="/">
          返回首页
        </Link>
      </main>
    );
  }

  if (mode !== undefined && !isConversationMode(mode)) {
    return (
      <main className="page-shell">
        <h1>请选择有效的对话方式</h1>
        <Link className="button-link" href={`/chat/${expert.slug}`}>
          返回聊天
        </Link>
      </main>
    );
  }

  const conversationMode = mode ?? "self-reflection";

  return (
    <main className="chat-page-shell">
      <ChatWorkspace
        expert={{
          slug: expert.slug,
          nameEn: expert.nameEn,
          nameZh: expert.nameZh,
          era: expert.era
        }}
        mode={conversationMode}
      />
    </main>
  );
}

function isConversationMode(mode: string | undefined): mode is ConversationMode {
  return CONVERSATION_MODES.includes(mode as ConversationMode);
}
