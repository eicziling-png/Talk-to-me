import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PartyChatPage from "@/app/chat/party/page";
import Home from "@/app/page";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Let's party entry", () => {
  it("keeps eight entries in two four-item columns with party in the right column", () => {
    render(<Home />);

    const navigation = screen.getByRole("navigation");
    const partyLink = within(navigation).getByRole("link", { name: /Let's party/ });
    const columns = navigation.querySelectorAll(".figma-homepage__expert-column");

    expect(partyLink).toHaveAttribute("href", "/chat/party");
    expect(within(navigation).getAllByRole("link")).toHaveLength(8);
    expect(columns).toHaveLength(2);
    expect(within(columns[0] as HTMLElement).getAllByRole("link")).toHaveLength(4);
    expect(within(columns[1] as HTMLElement).getAllByRole("link")).toHaveLength(4);
    expect(columns[1]).toContainElement(partyLink);
    expect(partyLink).toHaveClass("figma-homepage__party-entry");
  });

  it("renders a local-only seven-voice party room shell", async () => {
    const view = await PartyChatPage();
    render(view);

    expect(screen.getByRole("region", { name: /Let's party/ })).toHaveClass("figma-chatpage", "party-chatpage");
    expect(screen.getByText(/Let's party :\)/)).toBeInTheDocument();
    expect(screen.getByText(/七位历史心理学家/)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "群聊参与者" })).not.toBeInTheDocument();
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
