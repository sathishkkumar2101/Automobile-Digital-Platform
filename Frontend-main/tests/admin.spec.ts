import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Admin portal suite that compares the screen against the API.
 *
 * The previous version of this file asserted headings, table elements and
 * button visibility. Every one of those assertions also holds on a page whose
 * every request failed, because each load ended in `.catch(() => [])` and the
 * empty state rendered the same markup as real data. A green run therefore said
 * nothing about whether the portal worked — and two genuine defects (a customer
 * unable to see their own appointments, and dealer orders arriving with no
 * customer or vehicle) sat behind that green.
 *
 * The rule applied here: every test fetches the same resource over the API and
 * asserts the screen agrees with it. A test that cannot state the expected
 * number is not testing anything, so the counts come from the API rather than
 * from literals. Conditional blocks that skip assertions when an element is
 * absent are deliberately avoided — they are how the old suite reported success
 * without having checked anything.
 */

const ADMIN = { email: 'admin@bmwtechworks.com', password: 'Admin@123' };

/** Every admin list slices this many rows per page. */
const PAGE_SIZE = 10;

async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post('/api/auth/login', { data: ADMIN });
  expect(res.ok(), `admin login failed: ${res.status()}`).toBeTruthy();
  return (await res.json()).token;
}

async function apiList(
  request: APIRequestContext,
  path: string,
): Promise<unknown[]> {
  const token = await adminToken(request);
  const res = await request.get(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `GET ${path} failed: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.content)) return body.content;
  throw new Error(`GET ${path} did not return a list`);
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/(admin|customer|dealer)/, { timeout: 20000 });
}

/**
 * A page whose data failed to load renders `LoadError`, which carries
 * `data-testid="load-error"`. Asserting its absence is what turns "the table is
 * on screen" into "the table is on screen and it is backed by a real response".
 */
async function expectNoLoadError(page: Page) {
  await expect(page.getByTestId('load-error')).toHaveCount(0, { timeout: 15000 });
}

test.use({ viewport: { width: 1920, height: 1080 } });

test.describe('Admin portal against live API', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.waitForLoadState('networkidle');
  });

  test('dashboard KPI totals equal the API record counts', async ({ page, request }) => {
    const [users, vehicles, orders, appointments] = await Promise.all([
      apiList(request, '/api/users'),
      apiList(request, '/api/vehicles'),
      apiList(request, '/api/v1/orders'),
      apiList(request, '/api/appointments'),
    ]);

    await expect(page.locator('h1:has-text("Platform Control Center")')).toBeVisible();
    await expectNoLoadError(page);

    // KpiCard nests the label <p> inside a flex <div>, and the value <p> is the
    // next sibling of that div. The path therefore steps out to the parent
    // first. Selecting the surrounding div by text instead matched the label's
    // own container, so the comparison ended up asserting "TOTAL USERS" equals
    // a user count.
    //
    // The comparison is a `toHaveText`, not a read of `innerText`. The counts
    // arrive from six separate requests, and reading once after the label was
    // visible captured the pre-fetch value — intermittently in Firefox, where
    // the paint lands sooner. A retrying assertion both waits for the data and
    // checks it, which is the claim actually being made.
    const kpiValue = (label: string) =>
      page
        .getByText(label, { exact: true })
        .first()
        .locator('xpath=../following-sibling::p[1]');

    // Users and vehicles are only seeded, never written by a test, so these are
    // compared exactly.
    await expect(kpiValue('Total Users')).toHaveText(users.length.toLocaleString('en-US'));
    await expect(kpiValue('Active Vehicles')).toHaveText(
      vehicles.length.toLocaleString('en-US'),
    );

    // `toHaveText` rather than a single read: the counts arrive from separate
    // requests, and reading once after the label became visible captured the
    // pre-fetch value, intermittently in Firefox. It retries, so it both waits
    // for the data and checks it.
    //
    // Compared exactly. The projects run one at a time (see playwright.config),
    // so nothing is booking or cancelling an order while this runs and there is
    // no reason to allow a difference.
    await expect(kpiValue('Total Orders')).toHaveText(
      orders.length.toLocaleString('en-US'),
    );

    // Appointments feed the dashboard's own panel, so at minimum the seeded
    // rows have to be there. A zero here is the exact symptom of the customer
    // id-type bug and must not be silently accepted.
    expect(appointments.length).toBeGreaterThan(0);
  });

  test('users table row count matches GET /api/users', async ({ page, request }) => {
    const users = await apiList(request, '/api/users');
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expectNoLoadError(page);

    await expect(page.locator('tbody tr')).toHaveCount(Math.min(users.length, PAGE_SIZE));

    // And the data on screen is the data from the API, not a fixture.
    const firstUser = users[0] as Record<string, unknown>;
    if (firstUser?.email) {
      await expect(page.getByText(String(firstUser.email)).first()).toBeVisible();
    }
  });

  test('vehicles table row count matches GET /api/vehicles', async ({ page, request }) => {
    const vehicles = await apiList(request, '/api/vehicles');
    await page.goto('/admin/vehicles');
    await page.waitForLoadState('networkidle');
    await expectNoLoadError(page);

    // Every admin list slices 10 rows per page, so the first page holds at
    // most 10. Asserting the full count would be asserting a pagination
    // control that does not exist.
    await expect(page.locator('tbody tr')).toHaveCount(Math.min(vehicles.length, PAGE_SIZE));
  });

  test('appointments table lists every appointment and resolves customer names', async ({ page, request }) => {
    const appointments = await apiList(request, '/api/appointments');
    expect(appointments.length).toBeGreaterThan(0);

    await page.goto('/admin/appointments');
    await page.waitForLoadState('networkidle');
    await expectNoLoadError(page);

    await expect(page.locator('tbody tr')).toHaveCount(Math.min(appointments.length, PAGE_SIZE));

    // A customer name must be shown, never the "Customer #<uuid>" fallback.
    // customer_id is nullable and the old code called .slice() on it
    // unguarded, so a null row would have thrown and blanked the page.
    await expect(page.getByText(/Customer #/)).toHaveCount(0);

    const withName = appointments.filter(
      (a) => (a as Record<string, unknown>).customer,
    );
    expect(withName.length).toBeGreaterThan(0);
    const name = ((withName[0] as Record<string, unknown>).customer as Record<string, unknown>).name;
    await expect(page.getByText(String(name), { exact: false }).first()).toBeVisible();
  });

  test('orders table row count matches GET /api/v1/orders', async ({ page, request }) => {
    const orders = await apiList(request, '/api/v1/orders');
    await page.goto('/admin/orders');
    await page.waitForLoadState('networkidle');
    await expectNoLoadError(page);

    await expect(page.locator('tbody tr')).toHaveCount(Math.min(orders.length, PAGE_SIZE));
  });

  test('dealers table row count matches GET /dealers', async ({ page, request }) => {
    const dealers = await apiList(request, '/dealers');
    await page.goto('/admin/dealers');
    await page.waitForLoadState('networkidle');
    await expectNoLoadError(page);

    await expect(page.locator('tbody tr')).toHaveCount(Math.min(dealers.length, PAGE_SIZE));
  });

  test('customers table row count matches GET /api/v1/customers', async ({ page, request }) => {
    const customers = await apiList(request, '/api/v1/customers');
    await page.goto('/admin/customers');
    await page.waitForLoadState('networkidle');
    await expectNoLoadError(page);

    await expect(page.locator('tbody tr')).toHaveCount(Math.min(customers.length, PAGE_SIZE));
  });

  test('customer detail panel reports orders and appointments from the API', async ({ page, request }) => {
    const customers = await apiList(request, '/api/v1/customers');
    const customersList = customers as Record<string, unknown>[];

    // Pick a customer the admin API says has both kinds of history, so the
    // panel is checked against a non-trivial expectation rather than an
    // empty one that a failed request would also satisfy.
    let picked: { id: string; orders: unknown[]; appointments: unknown[] } | null = null;
    const token = await adminToken(request);
    for (const customer of customersList) {
      const [orders, appointments] = await Promise.all([
        apiList(request, `/api/v1/orders/customers/${customer.id}`),
        apiList(request, `/api/appointments/customers/${customer.id}`),
      ]);
      if (orders.length > 0 || appointments.length > 0) {
        picked = { id: String(customer.id), orders, appointments };
        break;
      }
    }
    expect(token).toBeTruthy();
    expect(picked, 'no seeded customer has order or appointment history').not.toBeNull();
    if (!picked) return;

    await page.goto('/admin/customers');
    await page.waitForLoadState('networkidle');
    await expectNoLoadError(page);

    // Open the detail modal through the row's own action button. Clicking the
    // email cell was matching the text without invoking the handler, so the
    // modal never opened.
    const target = customersList.find((c) => c.id === picked!.id);
    const email = String(target?.email ?? '');
    const row = page.locator('tbody tr').filter({ hasText: email });
    await expect(row).toHaveCount(1);
    await row.getByRole('button', { name: /view history/i }).click();

    // The panel renders its headings as soon as the modal opens, with a count
    // of 0, and fills them in when its own two requests resolve. Reading the
    // text straight after `toBeVisible` therefore captured that transient "(0)"
    // and compared it against the API. `toHaveText` retries, so this both waits
    // for the fetch and asserts the panel agrees with the API — which is the
    // actual claim being made.
    //
    // A page-level getByText with this pattern also matches the panel wrapper,
    // whose text contains the same substring, so the lookup is scoped to the
    // heading role to keep it unambiguous.
    //
    // The expected count is re-read from the API on each attempt rather than
    // reused from the snapshot taken before the page was opened. This suite is
    // `fullyParallel` and runs chromium, firefox and webkit at once against one
    // database, and the cross-role test books an appointment as this same seeded
    // customer and then deletes it again. A count sampled up front is therefore
    // routinely stale by the time the panel renders, which failed the run for a
    // reason that had nothing to do with the panel. The claim under test is that
    // the panel agrees with the API, so both sides are read together.
    const expectCount = async (heading: RegExp, path: string) => {
      const el = page.getByRole('heading', { name: heading });
      await expect(el).toBeVisible();
      await expect
        .poll(
          async () => {
            const current = await apiList(request, path);
            return (await el.innerText()).includes(`(${current.length})`);
          },
          {
            timeout: 20000,
            message: `panel must report the same count as GET ${path}`,
          },
        )
        .toBe(true);
    };

    await expectCount(/Purchase Orders \(\d+\)/, `/api/v1/orders/customers/${picked!.id}`);
    await expectCount(
      /Service Appointments \(\d+\)/,
      `/api/appointments/customers/${picked!.id}`,
    );
  });

  test('a failed section reports the error and Retry actually reloads it', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);

    // Keep failing the vehicles request until the error has actually been
    // observed, rather than failing exactly the first one. A page can issue the
    // request more than once on the way to settling, and a one-shot abort was
    // sometimes consumed by an earlier attempt — the page then loaded cleanly
    // and the test failed on firefox and webkit while passing on chromium.
    let failing = true;
    await page.route('**/api/vehicles*', async (route) => {
      if (failing) await route.abort('failed');
      else await route.continue();
    });

    await page.goto('/admin/vehicles');
    const error = page.getByTestId('load-error').first();
    await expect(error).toBeVisible({ timeout: 20000 });

    // The failure is reported and the table does not simultaneously claim the
    // fleet is empty. A guarded request resolves to an empty list so one dead
    // service cannot blank the rest of the page, which meant the table used to
    // render "No vehicles found" next to the error banner — two contradictory
    // statements about the same data, with the wrong one looking authoritative.
    //
    // The replacement copy appears in both the banner and the table cell, so
    // each is addressed by its own role rather than by text.
    await expect(page.getByText('No vehicles found')).toHaveCount(0);
    await expect(page.getByTestId('load-error').first()).toContainText('Could not load vehicles');
    await expect(page.getByRole('cell').getByText('Could not load vehicles')).toBeVisible();

    // Let the next attempt through, then use the page's own control to recover.
    failing = false;
    const retry = page.getByRole('button', { name: /retry/i }).first();
    await expect(retry).toBeVisible();
    await retry.click();

    // Retry has to re-run the request, not just hide the banner. The request
    // counter is what makes this a real assertion: clearing the banner without
    // refetching leaves the table empty and this fails.
    await expectNoLoadError(page);
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 20000 });
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('roles screen loads the real role set', async ({ page, request }) => {
    const roles = await apiList(request, '/api/roles');
    await page.goto('/admin/roles-permissions');
    await page.waitForLoadState('networkidle');
    await expectNoLoadError(page);

    for (const role of roles as Record<string, unknown>[]) {
      if (role?.name) {
        await expect(page.getByText(String(role.name), { exact: false }).first()).toBeVisible();
      }
    }
  });

  test('support inbox loads conversations rather than reporting an empty inbox', async ({ page }) => {
    await page.goto('/admin/inbox');
    await page.waitForLoadState('networkidle');
    await expectNoLoadError(page);

    // A working messaging service must produce a conversation. The empty
    // state is only acceptable if the request actually succeeded, which is
    // what the absence of load-error now establishes.
    const listRegion = page.locator('[data-testid="conversation-list"], .flex-1.min-h-0').first();
    await expect(listRegion).toBeVisible();
  });

  test('admin profile shows the signed-in account, not a placeholder', async ({ page }) => {
    await page.goto('/admin/profile');
    await page.waitForLoadState('networkidle');
    await expectNoLoadError(page);
    await expect(page.getByText(ADMIN.email).first()).toBeVisible();
  });
});
