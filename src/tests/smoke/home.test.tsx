import { render, screen } from "@testing-library/react";
import Home from "../../app/page";

describe("home page", () => {
  it("shows the product heading and compact educational-use notice", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Talk to me" })
    ).toBeVisible();
    expect(screen.getByText("对话过去的声音，靠近此刻的自己")).toBeVisible();
    expect(screen.getByText(/不提供诊断、治疗或临床服务/)).toBeVisible();
  });
});
