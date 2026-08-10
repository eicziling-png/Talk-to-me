import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PartyChatPage from "@/app/chat/party/page";
import Home from "@/app/page";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Let's party entry", () => {
  it("adds a party link after Yalom without removing expert links", () => {
    render(<Home />);

    const navigation = screen.getByRole("navigation");
    const partyLink = within(navigation).getByRole("link", { name: /Let's party/ });

    expect(partyLink).toHaveAttribute("href", "/chat/party");
    expect(within(navigation).getAllByRole("link")).toHaveLength(8);
  });

  it("renders a local-only seven-voice party room shell", async () => {
    const view = await PartyChatPage();
    render(view);

    expect(screen.getByRole("region", { name: /Let's party/ })).toHaveClass("figma-chatpage", "party-chatpage");
    expect(screen.getByText(/Let's party :\)/)).toBeInTheDocument();
    expect(screen.getByText(/七位历史心理学家/)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
  });

  it("keeps party submissions local until the multi-expert API exists", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const view = await PartyChatPage();
    render(view);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "大家好" } });
    fireEvent.click(screen.getByRole("button", { name: /送出/ }));

    expect(screen.getByText("大家好")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
