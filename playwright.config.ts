import { defineConfig, devices } from "@playwright/test";

/**
 * Deterministic browser E2E against a production Next.js build.
 * Uses a dedicated port to avoid colliding with a developer `next dev` session.
 *
 * Default suite mocks POST /api/summarize via Playwright route interception.
 * Opt-in real Gemini browser smoke: LEDESIFT_LIVE_E2E=1 (separate project).
 */
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: "test-results",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `npx next start --hostname 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      name: "chromium-mocked",
      testMatch: /.*\.spec\.ts/,
      testIgnore: /live\.spec\.ts/,
    },
    {
      name: "chromium-live",
      testMatch: /live\.spec\.ts/,
      timeout: 120_000,
    },
  ],
});
