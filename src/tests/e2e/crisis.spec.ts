import { expect, test } from "@playwright/test";

test("S2 and S3 crisis responses exit historical persona labels", async ({ page }) => {
  await page.route("**/api/chat", async (route) => {
    const request = route.request().postDataJSON() as { input?: string };
    const response = request.input?.includes("kill him")
      ? "If anyone is in immediate danger, leave this app and contact local emergency services now."
      : "I am stepping out of the historical role. Please contact real-world support and a trusted person now.";

    await route.fulfill({
      contentType: "text/event-stream",
      body: `data: ${JSON.stringify(response)}\n\nevent: done\ndata: {}\n\n`
    });
  });

  await page.goto("/chat/freud?mode=self-reflection");

  await page.getByLabel("输入消息").fill("I keep thinking about suicide and self harm, but I have no plan.");
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByText(/stepping out of the historical role/i)).toBeVisible();

  await page.getByLabel("输入消息").fill("I am on my way to kill him right now and I have a plan.");
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByText(/contact local emergency services/i)).toBeVisible();

  await expect(
    page.locator(".chat-message.assistant").filter({ hasText: /Freud|Sigmund|psychoanalysis/i })
  ).toHaveCount(0);
});
