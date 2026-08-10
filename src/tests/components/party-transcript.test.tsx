import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PartyTranscript } from "@/components/chat/party-transcript";
import type { PartyBrowserMessage } from "@/domain/party/types";

const messages: PartyBrowserMessage[] = [
  {
    id: "user-1",
    role: "user",
    content: "我想知道为什么自己总是在关系里退缩。",
    complete: true,
    createdAt: Date.UTC(2026, 7, 10, 5, 6)
  },
  {
    id: "expert-1",
    role: "expert",
    expertSlug: "freud",
    content: "也许可以留意退缩发生前的愿望与顾虑。",
    complete: true,
    createdAt: Date.UTC(2026, 7, 10, 5, 7)
  },
  {
    id: "expert-2",
    role: "expert",
    expertSlug: "winnicott",
    content: "我们可以先给这份感受留一点空间。",
    complete: false,
    createdAt: Date.UTC(2026, 7, 10, 5, 8)
  }
];

describe("PartyTranscript", () => {
  it("shows Chinese names, color markers, body, time, and generation status", () => {
    const { container } = render(<PartyTranscript messages={messages} status="streaming" />);

    expect(screen.getByText("西格蒙德·弗洛伊德")).toBeInTheDocument();
    expect(screen.getByText("唐纳德·温尼科特")).toBeInTheDocument();
    expect(screen.getByText("也许可以留意退缩发生前的愿望与顾虑。")).toBeInTheDocument();
    expect(screen.getByText("对方输入中...")).toBeInTheDocument();
    expect(container.querySelector(".party-marker--freud")).toBeInTheDocument();
    expect(container.querySelector(".party-marker--winnicott")).toBeInTheDocument();
    expect(screen.getAllByRole("time")).toHaveLength(3);
    expect(screen.queryByText(/1896|1939|Classical|British/)).not.toBeInTheDocument();
    expect(screen.queryByText(/更深|回声|孤独/)).not.toBeInTheDocument();
  });

  it("keeps user and expert lanes ordered without a participant roster", () => {
    const { container } = render(<PartyTranscript messages={messages} status="idle" />);

    const articles = [...container.querySelectorAll("article.party-message")];
    expect(articles.map((article) => article.getAttribute("data-role"))).toEqual([
      "user",
      "expert",
      "expert"
    ]);
    expect(screen.queryByRole("region", { name: /参与者/ })).not.toBeInTheDocument();
  });
});
