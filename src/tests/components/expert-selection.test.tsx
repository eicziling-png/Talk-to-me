import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ChatPage from "@/app/chat/[slug]/page";
import Home from "@/app/page";
import { EXPERTS } from "@/domain/experts/registry";

describe("home expert browsing", () => {
  it("renders all expert profile cards directly on the home page", () => {
    render(<Home />);

    const cards = screen.getAllByRole("article");

    expect(cards).toHaveLength(7);
    expect(screen.getByRole("heading", { name: "Talk to me" })).toBeInTheDocument();
    expect(screen.getByText("对话过去的声音，靠近此刻的自己")).toBeInTheDocument();
    expect(screen.queryByText("历史心理学家对话")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "与历史心理学家对话" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "选择专家" })).not.toBeInTheDocument();

    for (const expert of EXPERTS) {
      const card = screen.getByRole("article", { name: expert.nameEn });
      const link = within(card).getByRole("link", { name: "开始对话" });

      expect(within(card).getByText(expert.nameZh)).toBeInTheDocument();
      expect(within(card).getByText(expert.era)).toBeInTheDocument();
      expect(within(card).getByRole("heading", { name: "风格" })).toBeInTheDocument();
      for (const style of expert.style) {
        expect(within(card).getByText(style)).toBeInTheDocument();
      }
      expect(link).toHaveAttribute("href", `/chat/${expert.slug}`);
    }
  });

  it("orders experts by real birth year from earliest to latest", () => {
    render(<Home />);

    expect(screen.getAllByRole("article").map((card) => card.getAttribute("aria-label"))).toEqual([
      "Sigmund Freud",
      "Melanie Klein",
      "Donald Winnicott",
      "Wilfred Bion",
      "Jacques Lacan",
      "Heinz Kohut",
      "Irvin D. Yalom"
    ]);
  });

  it("uses a single-column profile-card list and hides school labels from cards", () => {
    render(<Home />);

    expect(screen.getByLabelText("专家卡片")).toHaveClass("home-expert-list");
    expect(screen.queryByText("经典精神分析")).not.toBeInTheDocument();
    expect(screen.queryByText("拉康派精神分析")).not.toBeInTheDocument();
    expect(screen.queryByText("英国客体关系")).not.toBeInTheDocument();
  });

  it("shows one small safety statement on the home page", () => {
    render(<Home />);

    expect(screen.queryByRole("heading", { name: "使用边界" })).not.toBeInTheDocument();
    expect(screen.getAllByText(/不提供诊断、治疗或临床服务/)).toHaveLength(1);
  });

  it("keeps Lacan as the Jung replacement on home cards", () => {
    render(<Home />);

    expect(screen.queryByRole("article", { name: /Carl Gustav Jung/i })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: /Jacques Lacan/i })).toBeInTheDocument();
    expect(screen.queryByText(/collective unconscious/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/archetype/i)).not.toBeInTheDocument();
  });
});

describe("direct chat route", () => {
  it("defaults direct chat links to the regular conversation mode", async () => {
    const view = await ChatPage({
      params: Promise.resolve({ slug: "yalom" }),
      searchParams: Promise.resolve({})
    });
    render(view);

    expect(screen.getByRole("heading", { name: /Irvin.*Yalom/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /请选择有效的对话方式/i })).not.toBeInTheDocument();
  });
});
