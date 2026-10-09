import { expect, test } from "@playwright/test";

/**
 * Opt-in real browser integration against the production server + Gemini.
 * Not part of the default mocked E2E proof.
 *
 * Run:
 *   $env:LEDESIFT_LIVE_E2E="1"; npx playwright test --project=chromium-live
 *
 * Requires GEMINI_API_KEY in the environment used by `next start`
 * (typically loaded via .env.local by Next.js).
 */
const enabled = process.env.LEDESIFT_LIVE_E2E === "1";

test.describe("Live browser full-stack (opt-in)", () => {
  test.skip(!enabled, "Set LEDESIFT_LIVE_E2E=1 to run real Gemini browser smoke");

  test("summarizes a public HTML page through the real API", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto("/");
    await page.getByLabel("Webpage URL").fill("https://quotes.toscrape.com/");
    await page.getByRole("button", { name: /distill this page/i }).click();

    await expect(page.getByText(/fetching and summarizing/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2 }),
    ).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(/summary/i).first()).toBeVisible();
    // Must not echo secrets into the DOM.
    await expect(page.locator("body")).not.toContainText(/AIza[0-9A-Za-z_-]{10,}/);
    await expect(page.locator("body")).not.toContainText("GEMINI_API_KEY");
  });
});
