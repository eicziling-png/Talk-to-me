import { expect, test } from "@playwright/test";

test("mobile layout keeps primary navigation, expert cards, and safety copy usable", async ({
  page
}, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "mobile-only acceptance");

  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
  await expect(page.getByRole("link", { name: "安全与隐私说明" }).first()).toBeVisible();

  await expect(page.getByRole("article", { name: /Donald Winnicott/i })).toBeVisible();

  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "安全与隐私说明" })).toBeVisible();
  await expect(page.getByText(/当前浏览器标签页/).first()).toBeVisible();
});
