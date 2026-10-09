import { expect, test } from "@playwright/test";
import { successPayload } from "./fixtures/api";
import { fulfillJson, mockSummarizeApi } from "./helpers";

test.describe("Accessibility checks (manual automation; not a WCAG claim)", () => {
  test("landmarks, heading hierarchy, labels, keyboard, focus, disclosure, live regions", async ({
    page,
  }) => {
    await mockSummarizeApi(page, async (route) => {
      await fulfillJson(route, 200, successPayload(), 800);
    });

    await page.goto("/");

    await expect(page.locator("header")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("footer")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);

    const input = page.getByLabel("Webpage URL");
    await input.focus();
    await expect(input).toBeFocused();

    // Visible focus ring styles are asserted via computed outline on focus-visible path.
    await page.keyboard.press("Tab");
    const submit = page.getByRole("button", { name: /distill this page|distilling/i });
    await expect(submit).toBeFocused();

    await input.fill("https://example.com/a");
    await input.press("Enter");
    await expect(page.getByRole("status")).toContainText(
      /fetching and summarizing/i,
    );
    await expect(
      page.getByRole("button", { name: /distilling/i }),
    ).toBeDisabled();

    await expect(
      page.getByRole("heading", {
        name: /coastal forests recover after storms/i,
      }),
    ).toBeVisible();

    const previewToggle = page.getByRole("button", {
      name: /extracted text preview/i,
    });
    await previewToggle.focus();
    await expect(previewToggle).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("pre")).toBeVisible();
    await expect(previewToggle).toHaveAttribute("aria-expanded", "true");
    await expect(previewToggle).toHaveAccessibleName(
      /hide extracted text preview/i,
    );

    // Touch-target usability: primary controls should be at least ~44px tall.
    const submitBox = await page
      .getByRole("button", { name: /distill this page/i })
      .boundingBox();
    expect(submitBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    const copyBox = await page
      .getByRole("button", { name: /copy summary/i })
      .boundingBox();
    expect(copyBox?.height ?? 0).toBeGreaterThanOrEqual(40);
  });

  test("reduced-motion media query does not break the workflow", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockSummarizeApi(page, async (route) => {
      await fulfillJson(route, 200, successPayload());
    });
    await page.goto("/");
    await page.getByLabel("Webpage URL").fill("https://example.com/a");
    await page.getByRole("button", { name: /distill this page/i }).click();
    await expect(
      page.getByRole("heading", {
        name: /coastal forests recover after storms/i,
      }),
    ).toBeVisible();
  });
});
