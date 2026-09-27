import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  fullyParallel: true,

  // Several assertions below compare rendered counts against API counts. Without
  // a ceiling a genuine mismatch retries for half a minute and then reports a
  // timeout instead of the real difference.
  timeout: 45_000,

  forbidOnly: !!process.env.CI,

  // Blocks until the frontend bundle is served and a real login succeeds. A
  // freshly rebuilt stack answers 503 from the gateway for a short while
  // because Eureka has not populated yet, which otherwise shows up as a spread
  // of unrelated-looking login failures in the test bodies.
  globalSetup: './tests/global-setup.ts',

  retries: process.env.CI ? 2 : 0,

  /*
   * One worker, always.
   *
   * The suite runs chromium, firefox and webkit against a single shared stack
   * and a single fixture database, with every test signing in as the same two
   * or three seeded accounts. That makes any assertion comparing a rendered
   * count against an API count a race against whichever sibling test is writing
   * to the same rows at that moment: the cross-role test books an order and an
   * appointment and then deletes them again, and the messaging tests create and
   * delete conversations.
   *
   * Those races had been showing up one at a time as unrelated-looking
   * failures — a KPI off by one, a stale row count, a de-duplication test
   * seeing a thread a sibling had just added. Widening the tolerances would hide
   * them one at a time without fixing the cause, and the tests are stronger when
   * they can compare exactly. Running the projects in sequence removes the
   * contention entirely and keeps all three browsers in the run; it costs wall
   * clock, which is the right trade for a suite that has to be trustworthy.
   *
   * Capping rather than leaving this at the default of half the cores was
   * already necessary for a second reason: every test drives a real browser
   * against a stack whose services hold 10s Eureka leases, so an unbounded
   * worker count starves registration and the run fails on gateway 503s.
   */
  workers: 1,

  reporter: 'html',

  use: {
    // The dockerised frontend serves the built bundle on 3000, and that is the
    // artefact the rest of the stack is verified against, so the suite points
    // there rather than at a dev server.
    //
    // These settings previously used baseURL :3000 while `webServer` waited on
    // :8443. Playwright was therefore gating on a server the tests never
    // touched, and `reuseExistingServer` made it a no-op whenever anything was
    // already listening, so a run silently exercised whichever build happened
    // to be up, which is not necessarily the code under review.
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
