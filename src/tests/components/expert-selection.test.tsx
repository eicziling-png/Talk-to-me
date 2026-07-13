import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ExpertsPage from "@/app/experts/page";
import ExpertPage from "@/app/experts/[slug]/page";
import { CONVERSATION_MODES } from "@/domain/conversation/schema";
import { EXPERTS } from "@/domain/experts/registry";

describe("expert discovery", () => {
  it("renders exactly seven expert cards with accessible profile links", () => {
    render(<ExpertsPage />);

    const cards = screen.getAllByRole("article");

    expect(cards).toHaveLength(7);

    for (const expert of EXPERTS) {
      const link = screen.getByRole("link", {
        name: new RegExp(`View ${expert.nameEn}`)
      });

      expect(link).toHaveAttribute("href", `/experts/${expert.slug}`);
      expect(screen.getByText(expert.nameZh)).toBeInTheDocument();
      expect(screen.getByText(expert.school)).toBeInTheDocument();
    }
  });

  it("shows hallmark concepts and educational-use language on the list", () => {
    render(<ExpertsPage />);

    expect(screen.getByText(/educational role simulation/i)).toBeInTheDocument();
    expect(screen.getByText(/not diagnosis/i)).toBeInTheDocument();

    const winnicottCard = screen.getByRole("article", { name: /Donald Winnicott/i });

    expect(within(winnicottCard).getByText(/holding environment/i)).toBeInTheDocument();
    expect(within(winnicottCard).getByText(/transitional object/i)).toBeInTheDocument();
  });
});

describe("expert profile", () => {
  it("renders expert details and all three chat modes for a known expert", async () => {
    const view = await ExpertPage({ params: Promise.resolve({ slug: "yalom" }) });
    render(view);

    expect(screen.getByRole("heading", { name: /Irvin.*Yalom/i })).toBeInTheDocument();
    expect(screen.getAllByText(/existential/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/starter questions/i)).toBeInTheDocument();

    for (const mode of CONVERSATION_MODES) {
      const link = screen.getByRole("link", {
        name: new RegExp(mode)
      });

      expect(link).toHaveAttribute("href", `/chat/yalom?mode=${mode}`);
    }
  });

  it("renders unknown-profile handling for an invalid slug", async () => {
    const view = await ExpertPage({ params: Promise.resolve({ slug: "unknown" }) });
    render(view);

    expect(screen.getByRole("heading", { name: /unknown expert/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /return to expert list/i })
    ).toHaveAttribute("href", "/experts");
  });
});
