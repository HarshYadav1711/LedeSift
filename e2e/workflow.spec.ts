import { expect, test } from "@playwright/test";
import { errorPayload, successPayload } from "./fixtures/api";
import {
  appAlert,
  collectConsoleErrors,
  fulfillJson,
  mockSummarizeApi,
} from "./helpers";

test.describe("LedeSift browser workflow (mocked API)", () => {
  test("homepage loads with branding and a single page heading", async ({
    page,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.goto("/");

    await expect(page.getByText("LedeSift").first()).toBeVisible();
    await expect(page.getByText("The page, distilled.")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /the internet is loud\. find the point\./i,
      }),
    ).toBeVisible();
    expect(await page.locator("h1").count()).toBe(1);
    expect(consoleErrors).toEqual([]);
  });

  test("URL field is labelled and keyboard accessible; empty and malformed input are rejected", async ({
    page,
  }) => {
    await page.goto("/");
    const input = page.getByLabel("Webpage URL");
    await expect(input).toBeVisible();

    await page.keyboard.press("Tab");
    // Focus may land on skip-less chrome; move to the labelled field explicitly.
    await input.focus();
    await expect(input).toBeFocused();

    await page.getByRole("button", { name: /distill this page/i }).click();
    await expect(page.locator("#url-error")).toContainText(
      /enter a webpage url/i,
    );

    await input.fill("notaurl");
    await input.press("Enter");
    await expect(page.locator("#url-error")).toContainText(
      /valid absolute url/i,
    );
  });

  test("valid URL submits on Enter, shows loading, and blocks duplicate submit", async ({
    page,
  }) => {
    let calls = 0;
    await mockSummarizeApi(page, async (route) => {
      calls += 1;
      await fulfillJson(route, 200, successPayload(), 400);
    });

    await page.goto("/");
    const input = page.getByLabel("Webpage URL");
    await input.fill("https://example.com/coastal-forests");
    await input.press("Enter");

    await expect(page.getByText(/fetching and summarizing/i)).toBeVisible();
    const submit = page.getByRole("button", { name: /distilling/i });
    await expect(submit).toBeDisabled();
    await expect(input).toBeDisabled();

    // Attempted duplicate click must not fire another request while disabled.
    await submit.click({ force: true }).catch(() => undefined);
    await expect(
      page.getByRole("heading", {
        name: /coastal forests recover after storms/i,
      }),
    ).toBeVisible();
    expect(calls).toBe(1);
  });

  test("successful mocked API data renders title, domain, summary, and ordered key points", async ({
    page,
  }) => {
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
    await expect(page.getByRole("link", { name: "example.com" })).toBeVisible();
    await expect(
      page.getByText(/coastal forests recovered faster than expected/i),
    ).toBeVisible();

    const points = page.locator("ul li");
    await expect(points).toHaveCount(3);
    await expect(points.nth(0)).toContainText(/seedling density/i);
    await expect(points.nth(1)).toContainText(/mixed-species/i);
    await expect(points.nth(2)).toContainText(/planting schedules/i);
  });

  test("empty keyPoints and partial-coverage notices render gracefully", async ({
    page,
  }) => {
    await mockSummarizeApi(page, async (route) => {
      await fulfillJson(
        route,
        200,
        successPayload({
          keyPoints: [],
          coverage: { extractionTruncated: true, inputTruncated: false },
        }),
      );
    });

    await page.goto("/");
    await page.getByLabel("Webpage URL").fill("https://example.com/a");
    await page.getByRole("button", { name: /distill this page/i }).click();

    await expect(
      page.getByText(/no separate key points were returned/i),
    ).toBeVisible();
    await expect(page.getByText(/partial coverage/i)).toBeVisible();
  });

  test("source preview opens/closes with escaped text, not executable HTML", async ({
    page,
  }) => {
    const riskyPreview =
      'Plain text <script>window.__ledesift_xss=1</script> and <img src=x onerror="window.__ledesift_xss=1">';
    await mockSummarizeApi(page, async (route) => {
      await fulfillJson(
        route,
        200,
        successPayload({ sourcePreview: riskyPreview }),
      );
    });

    await page.goto("/");
    await page.getByLabel("Webpage URL").fill("https://example.com/a");
    await page.getByRole("button", { name: /distill this page/i }).click();

    await page
      .getByRole("button", { name: /show extracted text preview/i })
      .click();
    const preview = page.locator("pre");
    await expect(preview).toContainText("<script>");
    await expect(preview).toContainText("window.__ledesift_xss=1");

    const executed = await page.evaluate(
      () => (window as unknown as { __ledesift_xss?: number }).__ledesift_xss,
    );
    expect(executed).toBeUndefined();

    await page
      .getByRole("button", { name: /hide extracted text preview/i })
      .click();
    await expect(preview).toHaveCount(0);
  });

  test("copy summary succeeds or reports clipboard failure honestly", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
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

    await page.getByRole("button", { name: /copy summary/i }).click();
    await expect(page.getByText(/summary copied/i)).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("Coastal Forests Recover After Storms");
    expect(clipboard).toContain("Coastal forests recovered faster");
    expect(clipboard).toContain("Seedling density rebounded");

    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: () => Promise.reject(new Error("denied")),
        },
      });
    });
    await page.getByRole("button", { name: /copy summary/i }).click();
    await expect(page.getByText(/could not copy/i)).toBeVisible();
  });

  test("open source uses final URL with safe link attributes", async ({
    page,
  }) => {
    await mockSummarizeApi(page, async (route) => {
      await fulfillJson(
        route,
        200,
        successPayload({
          source: {
            requestedUrl: "https://example.com/start",
            finalUrl: "https://example.com/final-article",
            title: "Redirected Article",
            wordCount: 120,
            extractionMethod: "readability",
          },
        }),
      );
    });

    await page.goto("/");
    await page.getByLabel("Webpage URL").fill("https://example.com/start");
    await page.getByRole("button", { name: /distill this page/i }).click();

    const openSource = page.getByRole("link", { name: /open source/i });
    await expect(openSource).toHaveAttribute(
      "href",
      "https://example.com/final-article",
    );
    await expect(openSource).toHaveAttribute("target", "_blank");
    await expect(openSource).toHaveAttribute("rel", "noopener noreferrer");

    const domainLink = page.getByRole("link", { name: "example.com" });
    await expect(domainLink).toHaveAttribute(
      "href",
      "https://example.com/final-article",
    );
    await expect(domainLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("API errors and network failures display; user can retry", async ({
    page,
  }) => {
    let mode: "error" | "network" | "success" = "error";
    await mockSummarizeApi(page, async (route) => {
      if (mode === "error") {
        await fulfillJson(
          route,
          429,
          errorPayload(
            "AI_RATE_LIMITED",
            "Too many requests. Please wait a moment and try again.",
            false,
          ),
        );
        return;
      }
      if (mode === "network") {
        await route.abort("failed");
        return;
      }
      await fulfillJson(route, 200, successPayload());
    });

    await page.goto("/");
    const input = page.getByLabel("Webpage URL");
    await input.fill("https://example.com/a");
    await page.getByRole("button", { name: /distill this page/i }).click();
    await expect(appAlert(page)).toContainText(/too many requests/i);
    await expect(page.getByText(/quota reached/i)).toHaveCount(0);

    mode = "network";
    await page.getByRole("button", { name: /distill this page/i }).click();
    await expect(appAlert(page)).toContainText(
      /could not reach the summarization service/i,
    );

    mode = "success";
    await page.getByRole("button", { name: /distill this page/i }).click();
    await expect(
      page.getByRole("heading", {
        name: /coastal forests recover after storms/i,
      }),
    ).toBeVisible();
  });

  test("a newer request wins over an older in-flight request", async ({
    page,
  }) => {
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    await mockSummarizeApi(page, async (route, body) => {
      if (body.url?.includes("first")) {
        await firstGate;
        await fulfillJson(
          route,
          200,
          successPayload({
            source: {
              requestedUrl: "https://example.com/first",
              finalUrl: "https://example.com/first",
              title: "Stale Title Should Not Win",
              wordCount: 40,
              extractionMethod: "readability",
            },
            summary: "Stale summary body that must not appear.",
          }),
        );
        return;
      }
      await fulfillJson(
        route,
        200,
        successPayload({
          source: {
            requestedUrl: "https://example.com/second",
            finalUrl: "https://example.com/second",
            title: "Fresh Title Wins",
            wordCount: 40,
            extractionMethod: "readability",
          },
          summary: "Fresh summary body that should remain visible.",
        }),
      );
    });

    await page.goto("/");
    await page.getByLabel("Webpage URL").fill("https://example.com/first");
    await page.getByRole("button", { name: /distill this page/i }).click();
    await expect(page.getByText(/fetching and summarizing/i)).toBeVisible();

    // Production disables controls while submitting; force a second submit to
    // exercise AbortController + request-id stale-response guards.
    await page.evaluate(() => {
      const field = document.getElementById(
        "page-url",
      ) as HTMLInputElement | null;
      const button = document.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement | null;
      const form = document.querySelector("form");
      if (!field || !button || !form) {
        throw new Error("form controls missing");
      }
      field.disabled = false;
      button.disabled = false;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(field, "https://example.com/second");
      field.dispatchEvent(new Event("input", { bubbles: true }));
      form.requestSubmit();
    });

    await expect(
      page.getByRole("heading", { name: /fresh title wins/i }),
    ).toBeVisible();

    releaseFirst?.();
    await page.waitForTimeout(300);
    await expect(
      page.getByRole("heading", { name: /fresh title wins/i }),
    ).toBeVisible();
    await expect(page.getByText(/stale title should not win/i)).toHaveCount(0);
  });
});
