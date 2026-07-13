import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatWorkspace } from "@/components/chat/chat-workspace";

const expert = {
  slug: "winnicott" as const,
  nameEn: "Donald Winnicott",
  nameZh: "温尼科特"
};

function renderWorkspace() {
  return render(<ChatWorkspace expert={expert} mode="self-reflection" />);
}

function sseResponse(chunks: string[], ok = true, status = 200): Response {
  const body = chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "event: done\ndata: {}\n\n";
  return new Response(body, {
    status,
    statusText: ok ? "OK" : "Error",
    headers: { "content-type": "text/event-stream" }
  });
}

describe("ChatWorkspace", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse(["Hello", " there"])));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("disables empty submissions", () => {
    renderWorkspace();

    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  it("sends a message and streams an assistant reply", async () => {
    renderWorkspace();

    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "How do I think about play?" }
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({ method: "POST" })
    );

    expect(await screen.findByText("How do I think about play?")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Hello there")).toBeInTheDocument();
    });
  });

  it("preserves unsent input after server failure and retries the failed message", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("fail", { status: 500 }))
      .mockResolvedValueOnce(sseResponse(["Recovered"]));
    vi.stubGlobal("fetch", fetchMock);
    renderWorkspace();

    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "First message" }
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await screen.findByText(/reply failed/i);

    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "Draft I do not want to lose" }
    });
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await screen.findByText("Recovered");
    expect(screen.getByLabelText(/message/i)).toHaveValue("Draft I do not want to lose");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("marks interrupted replies incomplete and clears the transcript", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => sseResponse(["Partial"]))
    );
    renderWorkspace();

    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "Please answer slowly" }
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await screen.findByRole("button", { name: /stop/i });
    fireEvent.click(screen.getByRole("button", { name: /stop/i }));

    await waitFor(() => {
      expect(screen.getByText(/incomplete/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(screen.queryByText("Please answer slowly")).not.toBeInTheDocument();
  });
});
