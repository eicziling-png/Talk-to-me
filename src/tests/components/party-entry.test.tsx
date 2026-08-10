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

  it("sends party submissions only to the isolated multi-expert API", async () => {
    const fetchSpy = vi.fn(async () =>
      new Response(
        'event: plan\ndata: {"type":"plan","selectedExpertSlugs":["winnicott"],"messageLimit":1}\n\n' +
          'event: done\ndata: {"type":"done"}\n\n',
        { headers: { "content-type": "text/event-stream" } }
      )
    );
    vi.stubGlobal("fetch", fetchSpy);
    const view = await PartyChatPage();
    render(view);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "大家好" } });
    fireEvent.click(screen.getByRole("button", { name: /送出/ }));

    expect(screen.getByText("大家好")).toBeInTheDocument();
    await screen.findByText(/本轮有 1 位专家回应/);
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/chat/party",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchSpy).not.toHaveBeenCalledWith("/api/chat", expect.anything());
  });
});
