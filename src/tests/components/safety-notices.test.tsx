import { render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AboutPage from "@/app/about/page";
import ChatPage from "@/app/chat/[slug]/page";
import RootLayout from "@/app/layout";
import Home from "@/app/page";
import { CrisisNotice, CRISIS_RESOURCES } from "@/components/safety/crisis-notice";

function expectSafetyAndPrivacyLinks() {
  expect(screen.getByRole("link", { name: /安全与隐私说明/i })).toHaveAttribute(
    "href",
    "/about"
  );
}

describe("safety and privacy surfaces", () => {
  it("links safety and privacy information from the shared layout", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <main>
          <h1>Primary route content</h1>
        </main>
      </RootLayout>
    );

    expect(html).toContain('href="/about"');
    expect(html).toContain("安全与隐私说明");
  });

  it("keeps safety and privacy information reachable from routed pages that carry safety detail", async () => {
    const routes = [
      await ChatPage({
        params: Promise.resolve({ slug: "winnicott" }),
        searchParams: Promise.resolve({ mode: "self-reflection" })
      }),
      <AboutPage key="about" />
    ];

    for (const route of routes) {
      const view = render(route);
      expectSafetyAndPrivacyLinks();
      view.unmount();
    }
  });

  it("publishes methodology, privacy, authenticity, and emergency-boundary copy", () => {
    render(<AboutPage />);

    expect(screen.getByRole("heading", { name: /安全与隐私说明/i })).toBeInTheDocument();
    expect(screen.getAllByText(/教育性角色模拟/).length).toBeGreaterThan(0);
    expect(screen.getByText(/不是诊断、治疗或持牌临床服务/)).toBeInTheDocument();
    expect(screen.getAllByText(/当前浏览器标签页/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/模型供应商/).length).toBeGreaterThan(0);
    expect(screen.getByText(/无法联系急救/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /历史真实性/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /方法说明/ })).toBeInTheDocument();
  });

  it("renders crisis resources from reviewed configuration rather than generated text", () => {
    render(<CrisisNotice />);

    expect(CRISIS_RESOURCES.length).toBeGreaterThan(0);

    for (const resource of CRISIS_RESOURCES) {
      const item = screen.getByRole("listitem", { name: new RegExp(resource.label) });

      expect(within(item).getByText(resource.action)).toBeInTheDocument();
      expect(within(item).getByText(new RegExp(resource.reviewedAt))).toBeInTheDocument();
    }
  });

  it("does not label personas as doctors or licensed therapists", () => {
    const html = renderToStaticMarkup(
      <>
        <Home />
        <AboutPage />
      </>
    );

    expect(html).not.toMatch(/\bdoctors?\b/i);
    expect(html).not.toMatch(/licensed therapists?/i);
    expect(html).not.toMatch(/医生/);
    expect(html).not.toMatch(/持牌治疗师/);
  });
});
