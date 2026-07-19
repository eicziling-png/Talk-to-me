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

function streamingSseResponse(): { response: Response; enqueue: (chunk: string) => void; close: () => void } {
  const encoder = new TextEncoder();
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
    }
  });

  return {
    response: new Response(stream, {
      status: 200,
      headers: { "content-type": "text/event-stream" }
    }),
    enqueue(chunk: string) {
      controllerRef?.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
    },
    close() {
      controllerRef?.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
      controllerRef?.close();
    }
  };
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

    expect(screen.getByRole("button", { name: /发送/i })).toBeDisabled();
  });

  it("sends a message and streams an expert reply in messenger layout", async () => {
    const { container } = renderWorkspace();

    fireEvent.change(screen.getByLabelText(/输入消息/i), {
      target: { value: "How do I think about play?" }
    });
    fireEvent.click(screen.getByRole("button", { name: /发送/i }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({ method: "POST" })
    );

    expect(await screen.findByText("How do I think about play?")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Hello there")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Donald Winnicott").length).toBeGreaterThan(0);
    expect(screen.queryByText("Assistant")).not.toBeInTheDocument();
    expect(screen.queryByText("User")).not.toBeInTheDocument();
    expect(screen.queryByText("AI")).not.toBeInTheDocument();
    expect(container.querySelector(".chat-message.user .message-avatar")).toBeInTheDocument();
    expect(container.querySelector(".chat-message.assistant .message-avatar")).toBeInTheDocument();
    expect(container.querySelector(".chat-message.user .message-bubble")).toBeInTheDocument();
    expect(container.querySelector(".chat-message.assistant .message-bubble")).toBeInTheDocument();
  });

  it("renders the first SSE chunk before the response stream closes", async () => {
    const stream = streamingSseResponse();
    vi.stubGlobal("fetch", vi.fn(async () => stream.response));
    renderWorkspace();

    fireEvent.change(screen.getByLabelText(/输入消息/i), {
      target: { value: "Please answer progressively" }
    });
    fireEvent.click(screen.getByRole("button", { name: /发送/i }));

    stream.enqueue("First");

    await screen.findByText("First");
    expect(screen.queryByText("First second")).not.toBeInTheDocument();

    stream.enqueue(" second");
    stream.close();

    await screen.findByText("First second");
  });

  it("preserves unsent input after server failure and retries the failed message", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("fail", { status: 500 }))
      .mockResolvedValueOnce(sseResponse(["Recovered"]));
    vi.stubGlobal("fetch", fetchMock);
    renderWorkspace();

    fireEvent.change(screen.getByLabelText(/输入消息/i), {
      target: { value: "First message" }
    });
    fireEvent.click(screen.getByRole("button", { name: /发送/i }));

    await screen.findByText("发送失败，可以点重试。");

    fireEvent.change(screen.getByLabelText(/输入消息/i), {
      target: { value: "Draft I do not want to lose" }
    });
    fireEvent.click(screen.getByRole("button", { name: /重试/i }));

    await screen.findByText("Recovered");
    expect(screen.getByLabelText(/输入消息/i)).toHaveValue("Draft I do not want to lose");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("marks interrupted replies incomplete and clears the transcript", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => sseResponse(["Partial"]))
    );
    renderWorkspace();

    fireEvent.change(screen.getByLabelText(/输入消息/i), {
      target: { value: "Please answer slowly" }
    });
    fireEvent.click(screen.getByRole("button", { name: /发送/i }));

    await screen.findByRole("button", { name: /停止/i });
    fireEvent.click(screen.getByRole("button", { name: /停止/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/消息中断/i).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /清空/i }));
    expect(screen.queryByText("Please answer slowly")).not.toBeInTheDocument();
  });

  it("ignores late request failures after the transcript is cleared", async () => {
    let rejectRequest: (error: Error) => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((_resolve, reject) => {
            rejectRequest = reject;
          })
      )
    );
    renderWorkspace();

    fireEvent.change(screen.getByLabelText(/输入消息/i), {
      target: { value: "Please do not come back after clear" }
    });
    fireEvent.click(screen.getByRole("button", { name: /发送/i }));
    await screen.findByText("Please do not come back after clear");

    fireEvent.click(screen.getByRole("button", { name: /清空/i }));
    rejectRequest(new Error("late failure"));

    await waitFor(() => {
      expect(screen.queryByText(/发送失败/i)).not.toBeInTheDocument();
      expect(screen.queryByText("发送失败，点重试再试一次。")).not.toBeInTheDocument();
      expect(screen.queryByText("Please do not come back after clear")).not.toBeInTheDocument();
    });
  });
});
