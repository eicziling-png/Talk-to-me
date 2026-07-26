import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ChatPage from "@/app/chat/[slug]/page";
import Home from "@/app/page";
import { EXPERT_DISPLAY_COPY, FIGMA_HOME_ORDER } from "@/components/expert/display-copy";
import { EXPERTS } from "@/domain/experts/registry";

function formatEra(era: string): string {
  return era.replace("-", "–");
}

describe("home expert browsing", () => {
  it("renders all expert entrances directly on the home page", () => {
    render(<Home />);

    const cards = screen.getAllByRole("article");

    expect(cards).toHaveLength(7);
    expect(screen.getByRole("heading", { name: "Talk to me" })).toBeInTheDocument();
    expect(screen.getByText("对话过去的声音，靠近此刻的自己")).toBeInTheDocument();
    expect(screen.queryByText("历史心理学家对话")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "选择专家" })).not.toBeInTheDocument();

    for (const expert of EXPERTS) {
      const era = formatEra(expert.era);
      const card = screen.getByRole("article", { name: `${expert.nameZh}，${era}` });
      const link = within(card).getByRole("link", { name: `开始与${expert.nameZh}对话` });

      expect(within(card).getByText(`${expert.nameZh} · ${era}`)).toBeInTheDocument();
      expect(within(card).getByText(EXPERT_DISPLAY_COPY[expert.slug].poeticLine)).toBeInTheDocument();
      expect(link).toHaveAttribute("href", `/chat/${expert.slug}`);
    }
  });

  it("uses the final Figma visual order for the room entrances", () => {
    render(<Home />);

    expect(screen.getAllByRole("article").map((card) => card.getAttribute("data-expert"))).toEqual(FIGMA_HOME_ORDER);
  });

  it("uses a spatial oil-room layout and hides school labels from cards", () => {
    render(<Home />);

    expect(screen.getByLabelText("选择一位历史心理学家")).toHaveClass("home-expert-list");
    expect(screen.getByRole("main")).toHaveClass("oil-room");
    expect(screen.getByRole("main").querySelector(".oil-plane-blue")).toBeInTheDocument();
    expect(screen.getByRole("main").querySelector(".oil-plane-warm")).toBeInTheDocument();
    expect(screen.getByRole("main").querySelector(".oil-plane-plant")).not.toBeInTheDocument();
    expect(screen.queryByText("经典精神分析")).not.toBeInTheDocument();
    expect(screen.queryByText("拉康派精神分析")).not.toBeInTheDocument();
    expect(screen.queryByText("英国客体关系")).not.toBeInTheDocument();
  });

  it("keeps Lacan as the Jung replacement on home cards", () => {
    render(<Home />);

    expect(screen.queryByRole("article", { name: /Carl Gustav Jung/i })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "雅克·拉康，1901–1981" })).toBeInTheDocument();
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

    expect(screen.getByText(/欧文·亚隆 · 1931–/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /请选择有效的对话方式/i })).not.toBeInTheDocument();
  });
});
