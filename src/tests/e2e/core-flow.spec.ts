import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      contentType: "text/event-stream",
      body: 'data: "A held reply"\n\ndata: " across turns."\n\nevent: done\ndata: {}\n\n'
    });
  });
});

test("user can select an expert, choose every mode, chat, retry, clear, export, and use keyboard navigation", async ({
  page
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "与历史心理学家对话" })).toBeVisible();
  await expect(page.getByText(/本工具仅用于心理学教育和角色模拟/)).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "首页" })).toBeFocused();

  await page.getByRole("link", { name: "探索七位专家人格" }).click();
  await expect(page.getByRole("heading", { name: /Choose an expert persona/i })).toBeVisible();
  await page.getByRole("link", { name: /View Donald Winnicott/i }).click();

  for (const mode of ["self-reflection", "theory-classroom", "critical-discussion"]) {
    await expect(page.getByRole("link", { name: new RegExp(mode) })).toHaveAttribute(
      "href",
      `/chat/winnicott?mode=${mode}`
    );
  }

  await page.getByRole("link", { name: /self-reflection/ }).click();
  await expect(page.getByRole("heading", { name: /Chat with Donald Winnicott/i })).toBeVisible();
  await expect(page.getByText(/browser tab only/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Export markdown/i })).toBeDisabled();

  await page.getByLabel("Message").fill("How do I think about play?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("How do I think about play?")).toBeVisible();
  await expect(page.getByText("A held reply across turns.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Export markdown/i })).toBeEnabled();

  await page.unroute("**/api/chat");
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({ status: 500, body: "fail" });
  });
  await page.getByLabel("Message").fill("Please fail once");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(/Reply failed/i)).toBeVisible();

  await page.unroute("**/api/chat");
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      contentType: "text/event-stream",
      body: 'data: "Recovered"\n\nevent: done\ndata: {}\n\n'
    });
  });
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Recovered")).toBeVisible();

  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByText("How do I think about play?")).toHaveCount(0);
});
