import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ChatPage from "@/app/chat/[slug]/page";
import Home from "@/app/page";

describe("home expert browsing", () => {
  it("renders all expert entrances directly on the Figma homepage", () => {
    render(<Home />);

    const navigation = screen.getByRole("navigation", { name: "选择一位历史心理学家" });
    const links = within(navigation).getAllByRole("link");

    expect(links).toHaveLength(8);
    expect(screen.getByRole("heading", { name: "TALK TO ME" })).toBeInTheDocument();
    expect(screen.getByText("对话过去的声音，靠近此刻的自己")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveClass("figma-homepage");
    expect(screen.getByRole("main").querySelector(".figma-homepage__art")).toHaveAttribute(
      "src",
      "/figma/talk-to-me-homepage.png"
    );
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("uses the final Figma visual order for the room entrances", () => {
    render(<Home />);

    const navigation = screen.getByRole("navigation", { name: "选择一位历史心理学家" });
    expect(within(navigation).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/chat/freud",
      "/chat/klein",
      "/chat/winnicott",
      "/chat/bion",
      "/chat/party",
      "/chat/lacan",
      "/chat/kohut",
      "/chat/yalom"
    ]);
  });

  it("keeps the homepage focused on the visual entrance rather than theory labels", () => {
    render(<Home />);

    expect(screen.getByRole("navigation", { name: "选择一位历史心理学家" })).toHaveClass("home-expert-list");
    expect(screen.getByRole("main").querySelector(".figma-homepage__art")).toBeInTheDocument();
    expect(screen.queryByText(/collective unconscious/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/archetype/i)).not.toBeInTheDocument();
  });

  it("keeps Lacan as the Jung replacement on the homepage", () => {
    render(<Home />);

    expect(screen.queryByText(/Carl Gustav Jung/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "开始与拉康对话" })).toHaveAttribute("href", "/chat/lacan");
  });
});

describe("direct chat route", () => {
  it("keeps direct expert links on the regular conversation route", async () => {
    const view = await ChatPage({
      params: Promise.resolve({ slug: "yalom" }),
      searchParams: Promise.resolve({})
    });
    render(view);

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
