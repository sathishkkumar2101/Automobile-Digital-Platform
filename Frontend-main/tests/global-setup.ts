import type { FullConfig } from '@playwright/test';

/**
 * Waits for the stack to actually be usable before any test runs.
 *
 * Every test in this suite logs in, and logging in goes through the gateway to
 * `user-role-service` by service-discovery name. After a `docker compose up
 * --build` the containers report as started well before Eureka has populated,
 * and during that window the gateway answers login with
 *
 *   No servers available for service: user-role-service
 *   -> 503 Unable to find instance
 *
 * which the SPA renders as a failed sign-in. That surfaced as a burst of
 * `expect(page).toHaveURL(/\/(admin|customer|dealer)/)` failures pointing at
 * `tests/admin.spec.ts` — an error that reads like a broken login form and is
 * actually a not-yet-ready registry. Waiting here keeps that diagnosis out of
 * the test bodies, and means a run started immediately after a rebuild is
 * still valid.
 *
 * The readiness probe is the login itself rather than a port check, because the
 * port is open well before the route behind it resolves.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const GATEWAY = process.env.GATEWAY_URL ?? 'http://127.0.0.1:8080';
const PROBE = { email: 'admin@bmwtechworks.com', password: 'Admin@123' };

const DEADLINE_MS = 5 * 60_000;
const INTERVAL_MS = 3_000;

async function loginSucceeds(): Promise<boolean> {
  try {
    const response = await fetch(`${GATEWAY}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(PROBE),
      signal: AbortSignal.timeout(10_000),
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

async function frontendServesBundle(): Promise<boolean> {
  try {
    const response = await fetch(BASE_URL, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return false;
    // A 200 that serves an index.html referencing missing assets would fail
    // every test with a blank page, so the entry script is checked directly.
    const html = await response.text();
    const entry = html.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1];
    if (!entry) return false;
    const asset = await fetch(`${BASE_URL}${entry}`, { signal: AbortSignal.timeout(10_000) });
    return asset.ok;
  } catch {
    return false;
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const started = Date.now();
  let lastReport = 0;

  for (;;) {
    const [bundleReady, authReady] = await Promise.all([frontendServesBundle(), loginSucceeds()]);

    if (bundleReady && authReady) {
      const waited = Math.round((Date.now() - started) / 1000);
      console.log(`stack ready after ${waited}s — running tests against ${BASE_URL}`);
      return;
    }

    if (Date.now() - started > DEADLINE_MS) {
      throw new Error(
        `stack did not become ready within ${DEADLINE_MS / 1000}s ` +
          `(frontend bundle: ${bundleReady ? 'ok' : 'unavailable'}, ` +
          `login via ${GATEWAY}: ${authReady ? 'ok' : 'failing'}). ` +
          'If the bundle is fine but login is failing, check the gateway log for ' +
          '"No servers available for service" — that is service discovery still warming up.',
      );
    }

    if (Date.now() - lastReport > 15_000) {
      lastReport = Date.now();
      const waited = Math.round((Date.now() - started) / 1000);
      console.log(
        `waiting for stack (${waited}s) — bundle ${bundleReady ? 'ok' : 'pending'}, ` +
          `login ${authReady ? 'ok' : 'pending'}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
}
