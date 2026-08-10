import { expect, test, type Page } from "@playwright/test";

const partyEvents = [
  { type: "plan" },
  { type: "expert_start", id: "freud-e2e", expertSlug: "freud", order: 0 },
  { type: "expert_delta", id: "freud-e2e", expertSlug: "freud", text: "先留意这份愿望。" },
  { type: "expert_done", id: "freud-e2e", expertSlug: "freud", complete: true },
  { type: "expert_start", id: "winnicott-e2e", expertSlug: "winnicott", order: 1 },
  { type: "expert_delta", id: "winnicott-e2e", expertSlug: "winnicott", text: "先让感受有一个空间。" },
  { type: "expert_done", id: "winnicott-e2e", expertSlug: "winnicott", complete: true },
  { type: "turn_done", expertMessageCount: 2 },
  { type: "done" }
];

function partyStreamBody(events: readonly { type: string }[]): string {
  return events
    .map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
    .join("");
}

async function interceptParty(page: Page) {
  await page.route("**/api/chat/party", async (route) => {
    await route.fulfill({
      contentType: "text/event-stream",
      body: partyStreamBody(partyEvents)
    });
  });
}

test("party link opens the isolated room and completes an ordered multi-expert turn", async ({ page }) => {
  await interceptParty(page);
  await page.goto("/");
  await page.getByRole("link", { name: /Let's party/ }).click();

  await expect(page).toHaveURL(/\/chat\/party$/);
  await expect(page.getByRole("region", { name: /Let's party/ })).toBeVisible();
  await expect(page.getByText(/self-reflection/)).toHaveCount(0);
  await expect(page.getByRole("textbox")).toBeVisible();

  await page.getByRole("textbox").fill("我想和你们谈谈我的退缩。");
  await page.getByRole("button", { name: /送出/ }).click();

  await expect(page.getByText(/本轮有/)).toHaveCount(0);
  await expect(page.getByText("先留意这份愿望。")).toBeVisible();
  await expect(page.getByText("先让感受有一个空间。")).toBeVisible();
  await expect(page.locator("article.party-message--expert")).toHaveCount(2);
  await expect(page.locator("article.party-message--expert").nth(0)).toHaveAttribute(
    "data-expert",
    "freud"
  );
  await expect(page.locator("article.party-message--expert").nth(1)).toHaveAttribute(
    "data-expert",
    "winnicott"
  );

  await page.locator(".chat-menu summary").click();
  await page.locator(".chat-menu").getByRole("button", { name: /清空/ }).click();
  await expect(page.getByText("先留意这份愿望。")).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("先留意这份愿望。")).toHaveCount(0);
});

test("party stop control interrupts a pending request", async ({ page }) => {
  await page.route("**/api/chat/party", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await route.fulfill({
      contentType: "text/event-stream",
      body: partyStreamBody(partyEvents)
    });
  });
  await page.goto("/chat/party");
  await page.getByRole("textbox").fill("请慢一点回应。");
  await page.getByRole("button", { name: /送出/ }).click();
  await expect(page.getByRole("button", { name: /停止/ })).toBeVisible();
  await page.getByRole("button", { name: /停止/ }).click();
  await expect(page.locator("p[role='alert']")).toContainText("中断");
});

test("party mobile layout keeps composer, names, and lanes within the viewport", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "mobile-only acceptance");
  await interceptParty(page);
  await page.goto("/chat/party");

  await page.getByRole("textbox").fill("移动端布局检查。");
  await page.getByRole("button", { name: /送出/ }).click();
  await expect(page.getByText("先让感受有一个空间。")).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    overflowingNames: [...document.querySelectorAll(".party-message-name")].some(
      (element) => element.getBoundingClientRect().right > window.innerWidth
    ),
    overflowingComposer: (() => {
      const element = document.querySelector(".chat-composer");
      return element ? element.getBoundingClientRect().right > window.innerWidth : false;
    })()
  }));

  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  expect(dimensions.overflowingNames).toBe(false);
  expect(dimensions.overflowingComposer).toBe(false);
});
