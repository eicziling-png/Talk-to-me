import { expect, test } from "@playwright/test";

test("refresh cannot restore transcript and telemetry never receives full message text", async ({
  page
}) => {
  const userMessage = "This exact private sentence must not be logged";
  const telemetryPayloads: string[] = [];

  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      contentType: "text/event-stream",
      body: 'data: "Private reply"\n\nevent: done\ndata: {}\n\n'
    });
  });
  await page.route("**/api/telemetry", async (route) => {
    telemetryPayloads.push(route.request().postData() ?? "");
    await route.fulfill({ json: { ok: true } });
  });

  await page.goto("/chat/winnicott?mode=self-reflection");
  await page.getByLabel("输入消息").fill(userMessage);
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByText(userMessage)).toBeVisible();
  await expect(page.getByText("Private reply")).toBeVisible();

  await page.reload();
  await expect(page.getByText(userMessage)).toHaveCount(0);
  await expect(page.getByText("Private reply")).toHaveCount(0);
  expect(telemetryPayloads.join("\n")).not.toContain(userMessage);
});
