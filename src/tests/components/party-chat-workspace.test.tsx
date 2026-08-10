import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PartyChatWorkspace } from "@/components/chat/party-chat-workspace";

function partySseResponse(events: unknown[]): Response {
  const body = events
    .map((event) => {
      const typedEvent = event as { type: string };
      return `event: ${typedEvent.type}\ndata: ${JSON.stringify(event)}\n\n`;
    })
    .join("");

  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" }
  });
}

function renderWorkspace() {
  return render(<PartyChatWorkspace />);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PartyChatWorkspace", () => {
  it("sends the fixed self-reflection party request and renders only actual expert messages", async () => {
    const fetchMock = vi.fn(async () =>
      partySseResponse([
        { type: "plan" },
        { type: "expert_start", id: "freud-1", expertSlug: "freud", order: 0 },
        { type: "expert_delta", id: "freud-1", expertSlug: "freud", text: "先留意这份愿望。" },
        { type: "expert_done", id: "freud-1", expertSlug: "freud", complete: true },
        { type: "expert_start", id: "winnicott-1", expertSlug: "winnicott", order: 1 },
        { type: "expert_delta", id: "winnicott-1", expertSlug: "winnicott", text: "先让感受有一个空间。" },
        { type: "expert_done", id: "winnicott-1", expertSlug: "winnicott", complete: true },
        { type: "turn_done", expertMessageCount: 2 },
        { type: "done" }
      ])
    );
    vi.stubGlobal("fetch", fetchMock);
    renderWorkspace();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "我想和你们谈谈我的退缩。" } });
    fireEvent.click(screen.getByRole("button", { name: /送出/ }));

    await waitFor(() => expect(screen.queryByText(/本轮有/)).not.toBeInTheDocument());
    await screen.findByText("先留意这份愿望。");
    await screen.findByText("先让感受有一个空间。");
    expect(screen.getByText("西格蒙德·弗洛伊德")).toBeInTheDocument();
    expect(screen.getByText("唐纳德·温尼科特")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat/party",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"mode":"self-reflection"')
      })
    );
    expect(fetchMock.mock.calls[0]?.[0]).not.toBe("/api/chat");
    expect(screen.queryByText(/输入中/)).not.toBeInTheDocument();
  });

  it("does not submit empty input and keeps the composer reusable", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderWorkspace();

    expect(screen.getByRole("button", { name: /送出/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /送出/ }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops an in-flight request and clears the party transcript", async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );
    vi.stubGlobal("fetch", fetchMock);
    renderWorkspace();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "慢慢说也可以。" } });
    fireEvent.click(screen.getByRole("button", { name: /送出/ }));
    await screen.findByRole("button", { name: /停止/ });
    fireEvent.click(screen.getByRole("button", { name: /停止/ }));

    await waitFor(() => expect(screen.getByRole("button", { name: /送出/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /清空/ }));
    expect(screen.queryByText("慢慢说也可以。")).not.toBeInTheDocument();
    resolveFetch?.(partySseResponse([{ type: "done" }]));
  });

  it("shows retry after a request failure and preserves the failed input", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("failed", { status: 500 }))
      .mockResolvedValueOnce(
        partySseResponse([
          { type: "plan" },
          { type: "expert_start", id: "yalom-1", expertSlug: "yalom", order: 0 },
          { type: "expert_delta", id: "yalom-1", expertSlug: "yalom", text: "我们可以一起停留在这个问题上。" },
          { type: "expert_done", id: "yalom-1", expertSlug: "yalom", complete: true },
          { type: "turn_done", expertMessageCount: 1 },
          { type: "done" }
        ])
      );
    vi.stubGlobal("fetch", fetchMock);
    renderWorkspace();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "我害怕失去关系。" } });
    fireEvent.click(screen.getByRole("button", { name: /送出/ }));
    await screen.findByRole("button", { name: /重试/ });
    fireEvent.click(screen.getByRole("button", { name: /重试/ }));

    await screen.findByText("我们可以一起停留在这个问题上。");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the same session seed and full multi-turn history through a third request", async () => {
    let responseNumber = 0;
    const fetchMock = vi.fn(async () => {
      responseNumber += 1;
      return partySseResponse([
        { type: "plan" },
        { type: "expert_start", id: `expert-${responseNumber}`, expertSlug: "winnicott", order: 0 },
        { type: "expert_delta", id: `expert-${responseNumber}`, expertSlug: "winnicott", text: `reply-${responseNumber}` },
        { type: "expert_done", id: `expert-${responseNumber}`, expertSlug: "winnicott", complete: true },
        { type: "turn_done", expertMessageCount: 1 },
        { type: "done" }
      ]);
    });
    vi.stubGlobal("fetch", fetchMock);
    renderWorkspace();

    for (const input of ["first", "second", "third"]) {
      fireEvent.change(screen.getByRole("textbox"), { target: { value: input } });
      fireEvent.click(screen.getByRole("button", { name: "送出" }));
      await screen.findByText(`reply-${responseNumber}`);
    }

    const requests = fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)) as {
      history: unknown[];
      sessionSeed: number;
    });
    expect(requests[0]?.history).toHaveLength(0);
    expect(requests[1]?.history).toHaveLength(2);
    expect(requests[2]?.history).toHaveLength(4);
    expect(requests[0]?.sessionSeed).toEqual(expect.any(Number));
    expect(requests[1]?.sessionSeed).toBe(requests[0]?.sessionSeed);
    expect(requests[2]?.sessionSeed).toBe(requests[0]?.sessionSeed);
  });
});
