import { render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AboutPage from "@/app/about/page";
import ChatPage from "@/app/chat/[slug]/page";
import RootLayout from "@/app/layout";
import Home from "@/app/page";
import { CrisisNotice, CRISIS_RESOURCES } from "@/components/safety/crisis-notice";

describe("safety and privacy surfaces", () => {
  it("keeps safety and privacy information reachable from the shared layout", () => {
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

  it("shows compact safety copy on the homepage only as a low-key footer note", () => {
    render(<Home />);

    expect(screen.getByText("本工具为基于历史人物思想风格的角色模拟，不提供诊断、治疗或临床服务。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "安全与隐私说明" })).toHaveAttribute("href", "/about");
    expect(screen.queryByText(/教育性角色模拟/)).not.toBeInTheDocument();
  });

  it("removes the safety and privacy link from the chat surface", async () => {
    render(
      await ChatPage({
        params: Promise.resolve({ slug: "winnicott" }),
        searchParams: Promise.resolve({ mode: "self-reflection" })
      })
    );

    expect(screen.queryByRole("link", { name: "安全与隐私说明" })).not.toBeInTheDocument();
    expect(screen.getByText("这段聊天只保留在当前页面，刷新或关闭后会消失。")).toBeInTheDocument();
  });

  it("publishes methodology, privacy, authenticity, and emergency-boundary copy on the about page", () => {
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
