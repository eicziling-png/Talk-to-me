import { render, screen } from "@testing-library/react";

import Home from "../../app/page";

describe("home page", () => {
  it("shows the brand heading, poetic tagline, and compact home-only safety links", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { level: 1, name: "Talk to me" })).toBeVisible();
    expect(screen.getByText("对话过去的声音，靠近此刻的自己")).toBeVisible();
    expect(screen.getByText("本工具为基于历史人物思想风格的角色模拟，不提供诊断、治疗或临床服务。")).toBeVisible();
    expect(screen.getByRole("link", { name: "安全与隐私说明" })).toHaveAttribute("href", "/about");
    expect(screen.queryByText(/教育性角色模拟/)).not.toBeInTheDocument();
  });
});
