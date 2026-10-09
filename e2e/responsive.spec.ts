import { expect, test, type Page } from "@playwright/test";
import { errorPayload, successPayload } from "./fixtures/api";
import { appAlert, fulfillJson, mockSummarizeApi } from "./helpers";
import path from "node:path";
import fs from "node:fs";

const WIDTHS = [1440, 1280, 1024, 768, 390, 360, 320] as const;

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });
  expect(
    overflow.scrollWidth,
    `horizontal overflow at viewport: scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth}`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

async function settleIdle(page: Page) {
  await page.goto("/");
  await expect(page.getByText("LedeSift").first()).toBeVisible();
}

async function settleLoading(page: Page) {
  await mockSummarizeApi(page, async (route) => {
    await fulfillJson(route, 200, successPayload(), 2_500);
  });
  await page.goto("/");
  await page.getByLabel("Webpage URL").fill("https://example.com/a");
  await page.getByRole("button", { name: /distill this page/i }).click();
  await expect(page.getByText(/fetching and summarizing/i)).toBeVisible();
}

async function settleSuccess(page: Page) {
  await mockSummarizeApi(page, async (route) => {
    await fulfillJson(
      route,
      200,
      successPayload({
        source: {
          requestedUrl:
            "https://example.com/very/long/path/that/should/wrap-without-breaking-the-layout/article-with-an-extremely-long-slug",
          finalUrl:
            "https://example.com/very/long/path/that/should/wrap-without-breaking-the-layout/article-with-an-extremely-long-slug",
          title:
            "An Extremely Long Source Title That Should Wrap Gracefully Across Narrow Viewports Without Clipping Controls",
          wordCount: 220,
          extractionMethod: "readability",
        },
        keyPoints: [
          "A key point with a long unbroken token: https://example.com/this/is/a/very/long/url/path/that/must/wrap",
          "Second takeaway remains readable on narrow screens.",
        ],
        sourcePreview:
          "Preview text that is intentionally long. ".repeat(40) +
          "https://example.com/unbroken/url/token/that/should/not/force/horizontal/scroll",
      }),
    );
  });
  await page.goto("/");
  await page.getByLabel("Webpage URL").fill("https://example.com/a");
  await page.getByRole("button", { name: /distill this page/i }).click();
  await expect(
    page.getByRole("heading", { name: /extremely long source title/i }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /show extracted text preview/i })
    .click();
}

async function settleError(page: Page) {
  await mockSummarizeApi(page, async (route) => {
    await fulfillJson(
      route,
      502,
      errorPayload(
        "HTTP_ERROR",
        "The remote server returned an error response that is long enough to wrap on narrow screens without clipping adjacent controls.",
        true,
      ),
    );
  });
  await page.goto("/");
  await page.getByLabel("Webpage URL").fill("https://example.com/a");
  await page.getByRole("button", { name: /distill this page/i }).click();
  await expect(appAlert(page)).toContainText(/remote server returned an error/i);
}

test.describe("Responsive layout", () => {
  test.beforeAll(() => {
    fs.mkdirSync(path.join("test-results", "responsive"), { recursive: true });
  });

  for (const width of WIDTHS) {
    test(`idle / loading / success / error at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });

      await settleIdle(page);
      await assertNoHorizontalOverflow(page);
      await page.screenshot({
        path: path.join("test-results", "responsive", `idle-${width}.png`),
        fullPage: true,
      });

      await settleLoading(page);
      await assertNoHorizontalOverflow(page);
      await page.screenshot({
        path: path.join("test-results", "responsive", `loading-${width}.png`),
        fullPage: true,
      });

      await settleSuccess(page);
      await assertNoHorizontalOverflow(page);
      const summaryBox = await page
        .getByText(/coastal forests recovered faster/i)
        .boundingBox();
      expect(summaryBox).not.toBeNull();
      if (summaryBox) {
        expect(summaryBox.width).toBeLessThanOrEqual(width);
      }
      await page.screenshot({
        path: path.join("test-results", "responsive", `success-${width}.png`),
        fullPage: true,
      });

      await settleError(page);
      await assertNoHorizontalOverflow(page);
      await page.screenshot({
        path: path.join("test-results", "responsive", `error-${width}.png`),
        fullPage: true,
      });
    });
  }
});
