import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      contentType: "text/event-stream",
      body: 'data: "A held reply"\n\ndata: " across turns."\n\nevent: done\ndata: {}\n\n'
    });
  });
});

test("user can select an expert, start chatting, retry, clear, export, and use keyboard navigation", async ({
  page
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "与历史心理学家对话" })).toBeVisible();
  await expect(page.getByText(/不提供诊断、治疗或临床服务/)).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "首页" })).toBeFocused();

  await expect(page.getByRole("article", { name: /Donald Winnicott/i })).toBeVisible();
  await page
    .getByRole("article", { name: /Donald Winnicott/i })
    .getByRole("link", { name: "开始对话" })
    .click();
  await expect(page).toHaveURL(/\/chat\/winnicott$/);
  await expect(page.getByRole("heading", { name: /Donald Winnicott/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "返回首页" })).toHaveAttribute(
    "href",
    "/"
  );
  await expect(page.getByText(/当前页面/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /导出/i })).toBeDisabled();

  await page.getByLabel("输入消息").fill("How do I think about play?");
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByText("How do I think about play?")).toBeVisible();
  await expect(page.getByText("A held reply across turns.")).toBeVisible();
  await expect(page.getByRole("button", { name: /导出/i })).toBeEnabled();

  await page.unroute("**/api/chat");
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({ status: 500, body: "fail" });
  });
  await page.getByLabel("输入消息").fill("Please fail once");
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByText("发送失败，可以点重试。")).toBeVisible();

  await page.unroute("**/api/chat");
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      contentType: "text/event-stream",
      body: 'data: "Recovered"\n\nevent: done\ndata: {}\n\n'
    });
  });
  await page.getByRole("button", { name: "重试" }).click();
  await expect(page.getByText("Recovered")).toBeVisible();

  await page.getByRole("button", { name: "清空" }).click();
  await expect(page.getByText("How do I think about play?")).toHaveCount(0);
});
