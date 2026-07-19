import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ExpertsPage from "@/app/experts/page";
import ChatPage from "@/app/chat/[slug]/page";
import ExpertPage from "@/app/experts/[slug]/page";
import { EXPERTS } from "@/domain/experts/registry";

describe("expert discovery", () => {
  it("renders exactly seven expert cards with accessible profile links", () => {
    render(<ExpertsPage />);

    const cards = screen.getAllByRole("article");

    expect(cards).toHaveLength(7);

    for (const expert of EXPERTS) {
      const card = screen.getByRole("article", { name: expert.nameEn });
      const link = within(card).getByRole("link", {
        name: "了解这位专家"
      });

      expect(link).toHaveAttribute("href", `/experts/${expert.slug}`);
      expect(within(card).getByText(expert.nameZh)).toBeInTheDocument();
    }
  });

  it("uses plain Chinese discovery copy without concept bullets on the list", () => {
    render(<ExpertsPage />);

    expect(screen.getByText(/七位历史心理学大师/)).toBeInTheDocument();
    expect(screen.getByText(/不提供诊断、治疗或临床服务/)).toBeInTheDocument();

    const winnicottCard = screen.getByRole("article", { name: /Donald Winnicott/i });

    expect(within(winnicottCard).queryByText(/holding environment/i)).not.toBeInTheDocument();
    expect(within(winnicottCard).queryByText(/transitional object/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("article", { name: /Carl Gustav Jung/i })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: /Jacques Lacan/i })).toBeInTheDocument();
  });
});

describe("expert profile", () => {
  it("renders a simplified Chinese profile with one direct chat entry", async () => {
    const view = await ExpertPage({ params: Promise.resolve({ slug: "yalom" }) });
    render(view);

    expect(screen.getByRole("heading", { name: /Irvin.*Yalom/i })).toBeInTheDocument();
    expect(screen.getByText("欧文·亚隆")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "风格" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "开始对话" })).toBeInTheDocument();
    expect(screen.getByText(/历史人物思想风格/)).toBeInTheDocument();

    expect(screen.queryByText(/Hallmark concepts/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Starter questions/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Voice and style/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Start a conversation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Self-reflection/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Theory classroom/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Critical discussion/i)).not.toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "开始对话" })
    ).toHaveAttribute("href", "/chat/yalom");
  });

  it("renders Lacan as the Jung replacement with a direct chat entry", async () => {
    const view = await ExpertPage({ params: Promise.resolve({ slug: "lacan" }) });
    render(view);

    expect(screen.getByRole("heading", { name: "Jacques Lacan" })).toBeInTheDocument();
    expect(screen.getByText("雅克·拉康")).toBeInTheDocument();
    expect(screen.getByText("1901-1981")).toBeInTheDocument();
    expect(screen.getByText("拉康派精神分析")).toBeInTheDocument();
    expect(screen.getByText(/语言/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "开始对话" })).toHaveAttribute(
      "href",
      "/chat/lacan"
    );
    expect(screen.queryByText(/Carl Gustav Jung/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/collective unconscious/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/archetype/i)).not.toBeInTheDocument();
  });

  it("defaults direct chat links to the regular conversation mode", async () => {
    const view = await ChatPage({
      params: Promise.resolve({ slug: "yalom" }),
      searchParams: Promise.resolve({})
    });
    render(view);

    expect(screen.getByRole("heading", { name: /Irvin.*Yalom/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Choose a valid conversation mode/i })).not.toBeInTheDocument();
  });

  it("renders unknown-profile handling for an invalid slug", async () => {
    const view = await ExpertPage({ params: Promise.resolve({ slug: "unknown" }) });
    render(view);

    expect(screen.getByRole("heading", { name: "没有找到这位专家" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "返回专家列表" })
    ).toHaveAttribute("href", "/experts");
  });
});
