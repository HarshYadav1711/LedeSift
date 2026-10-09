import type { Page, Route } from "@playwright/test";
import type { SummarizeResponse } from "../src/lib/api/contracts";

export async function mockSummarizeApi(
  page: Page,
  handler: (route: Route, body: { url?: string }) => Promise<void> | void,
): Promise<void> {
  await page.route("**/api/summarize", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    let body: { url?: string } = {};
    try {
      body = route.request().postDataJSON() as { url?: string };
    } catch {
      body = {};
    }
    await handler(route, body);
  });
}

export async function fulfillJson(
  route: Route,
  status: number,
  payload: SummarizeResponse,
  delayMs = 0,
): Promise<void> {
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  return errors;
}

/** App alerts only — excludes Next.js `#__next-route-announcer__`. */
export function appAlert(page: Page) {
  return page.locator('[role="alert"]:not(#__next-route-announcer__)');
}
