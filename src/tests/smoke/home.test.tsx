import { render, screen } from "@testing-library/react";
import Home from "../../app/page";

describe("home page", () => {
  it("shows the product heading and educational-use notice", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "与历史心理学家对话" })
    ).toBeVisible();
    expect(screen.getByText(/本工具仅用于心理学教育和角色模拟/)).toBeVisible();
  });
});
