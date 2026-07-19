import { render, screen } from "@testing-library/react";
import Home from "../../app/page";

describe("home page", () => {
  it("shows the product heading and compact educational-use notice", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "与历史心理学家对话" })
    ).toBeVisible();
    expect(screen.getByText(/不提供诊断、治疗或临床服务/)).toBeVisible();
  });
});
