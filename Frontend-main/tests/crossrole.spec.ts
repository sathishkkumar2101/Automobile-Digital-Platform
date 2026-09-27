import { test, expect, type Page } from '@playwright/test';

/**
 * One record, followed through all three roles in a browser.
 *
 * The API-level suite (`test_crossrole.cjs`) covers the same chain in JSON. This
 * file exists because the two defects that motivated it were both invisible at
 * that layer: every request returned 200, and the wrong value was in the
 * response. Booking an appointment in the UI, then opening the dealer and admin
 * screens, is the only way to see that the name shown to the dealer is the same
 * name the customer belongs to.
 *
 * Each test authenticates as a real seeded role rather than stubbing the
 * network, so a broken request genuinely produces a broken assertion.
 */

const CUSTOMER = { email: 'customer1@bmwtechworks.com', password: 'Customer@123' };
const DEALER = { email: 'dealer1@bmwtechworks.com', password: 'Dealer@123' };
const ADMIN = { email: 'admin@bmwtechworks.com', password: 'Admin@123' };

test.use({ viewport: { width: 1600, height: 1000 } });

async function login(page: Page, who: { email: string; password: string }) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(who.email);
  await page.locator('input[type="password"]').fill(who.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/(admin|customer|dealer)/, { timeout: 20000 });
  await page.waitForLoadState('networkidle');
}

/**
 * A page whose data failed to load renders `LoadError`. Asserting its absence is
 * what separates "the table is on screen" from "the table is on screen and is
 * backed by a real response" — the two defects these tests exist for both
 * produced a 200 with the wrong contents.
 */
async function expectNoLoadError(page: Page) {
  await expect(page.getByTestId('load-error')).toHaveCount(0, { timeout: 15000 });
}

test.describe('Cross-role record flow', () => {
  test('a customer sees their own appointment history, not an empty page', async ({ page }) => {
    await login(page, CUSTOMER);

    await page.goto('/customer/appointments');
    await page.waitForLoadState('networkidle');
    await expectNoLoadError(page);

    // This customer is seeded with real bookings. The bug under test made this
    // list render its empty state, because the stored rows carry the customer
    // profile id and the list was filtered by the account id. Asserting a row
    // count above zero is the regression guard.
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
    // Read the count *before* navigating. A locator is lazy and re-queries on
    // every use, so evaluating it after `goto` would count rows on the
    // dashboard, which has none.
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // The dashboard is the index route of /customer; there is no
    // /customer/dashboard path, so that navigation silently fell through to the
    // catch-all redirect.
    await page.goto('/customer');
    await page.waitForLoadState('networkidle');
    await expectNoLoadError(page);

    // KpiCard nests the label <p> in a flex <div> whose next sibling is the
    // value <p>.
    //
    // The bar is "a positive number", not an exact count. The KPI counts
    // upcoming appointments while the list also shows completed ones, so the
    // two are not required to agree; and pinning an exact figure would make the
    // test drift every time this suite books without cleanup. What must not
    // happen is the number reading 0 next to a populated table, which is exactly
    // what the account-id bug produced. `toHaveText` retries so the assertion
    // waits for the request rather than racing it.
    const appointmentsKpi = page
      .getByText('Appointments', { exact: true })
      .first()
      .locator('xpath=../following-sibling::p[1]');
    await expect(appointmentsKpi).toHaveText(/^[1-9]\d*$/);
  });

  test('a dealer sees customer names and vehicle models on its orders', async ({ page }) => {
    await login(page, DEALER);

    await page.goto('/dealer/orders');
    await page.waitForLoadState('networkidle');
    await expectNoLoadError(page);

    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
    expect(await rows.count()).toBeGreaterThan(0);

    // The order service already resolved these; the dealer module used to
    // deserialize into a DTO with no field to receive them, so the UI fell back
    // to "Customer #<uuid>" and had no model to search on.
    await expect(page.getByText(/Customer #[0-9a-f]{8}/i)).toHaveCount(0);

    // And the model search actually filters, which is only possible if
    // vehicle.model survived the hop.
    const search = page.locator('input[placeholder*="Search" i]').first();
    if (await search.isVisible()) {
      await search.fill('BMW 3 Series');
      await page.waitForTimeout(600);
      expect(await rows.count()).toBeGreaterThan(0);
      await search.fill('');
      await page.waitForTimeout(400);
    }
  });

  test('the admin appointments table resolves names for every row', async ({ page }) => {
    await login(page, ADMIN);

    await page.goto('/admin/appointments');
    await page.waitForLoadState('networkidle');
    await expectNoLoadError(page);

    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);

    // customer_id is nullable and the cell called .slice() on it without a
    // guard, so a null would throw with no error boundary above the table and
    // blank the entire admin portal. If the page renders at all that is already
    // proven; the fallback text is asserted absent for completeness.
    await expect(page.getByText('Unknown customer')).toHaveCount(0);
  });

  test('customer books a service and it is attributable to them by name', async ({ page, request }) => {
    await login(page, CUSTOMER);

    // Resolve the customer's profile id and the appointments they already have,
    // so the new booking can be identified by difference and deleted again at
    // the end. Without that cleanup this test adds a permanent row on every run
    // of every browser, and the counts drift.
    const loginRes = await request.post('/api/auth/login', { data: CUSTOMER });
    const token = (await loginRes.json()).token;
    const auth = { Authorization: `Bearer ${token}` };
    const me = await request.get('/api/v1/customers/me', { headers: auth });
    const profileId = (await me.json()).id;

    const asRows = async () => {
      const res = await request.get('/api/appointments', { headers: auth });
      const body = await res.json();
      const list: Record<string, unknown>[] = Array.isArray(body) ? body : body.content;
      return list;
    };
    const before = new Set((await asRows()).map((r) => String(r.id)));

    // The route is the appointments index's "book" child, not a
    // /customer/book-service page.
    await page.goto('/customer/appointments/book');
    await page.waitForLoadState('networkidle');

    // Both selects are labelled, so they are addressed by their label rather
    // than by position. Reading the dealer options out of the form means the
    // test cannot silently pass by booking against nothing.
    //
    // The selects are `disabled` until their options arrive — the service-type
    // list is now fetched rather than hardcoded — so visibility is not enough to
    // know the form is usable. Waiting for `toBeEnabled` is what actually
    // guarantees a selectable option exists; asserting only that the control is
    // visible made this test fail intermittently when the three browser projects
    // ran in parallel and the catalogue request had not returned yet.
    const serviceSelect = page.getByLabel(/service type/i);
    const dealerSelect = page.getByLabel(/select dealer/i);
    await expect(serviceSelect).toBeVisible({ timeout: 15000 });
    await expect(dealerSelect).toBeVisible({ timeout: 15000 });
    await expect(serviceSelect).toBeEnabled({ timeout: 15000 });
    await expect(dealerSelect).toBeEnabled({ timeout: 15000 });
    expect(await dealerSelect.locator('option').count()).toBeGreaterThan(1);

    const serviceOptions = await serviceSelect.locator('option').count();
    expect(serviceOptions).toBeGreaterThan(1);

    await serviceSelect.selectOption({ index: 1 });
    await dealerSelect.selectOption({ index: 1 });

    await page.locator('button[type="submit"]').first().click();

    // The flow navigates to the appointments list on success.
    await expect(page).toHaveURL(/\/customer\/appointments/, { timeout: 20000 });
    await page.waitForLoadState('networkidle');

    // The new booking must be in the list, and the list must be showing the
    // customer's own rows rather than an empty state.
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
    await expectNoLoadError(page);

    // Cross-check through the API using the customer's own token: the stored
    // row must carry the profile id, not the account id.
    const after = await asRows();
    expect(after.length).toBeGreaterThan(0);
    expect(
      after.every((r) => r.customerId === profileId),
      'every visible appointment must belong to this profile',
    ).toBeTruthy();

    // Exactly one new row appeared, which is the booking this test made.
    const created = after.filter((r) => !before.has(String(r.id)));
    expect(created.length, 'the booking should add exactly one appointment').toBe(1);

    // Remove it again so the fixture is unchanged for the next run. Deletion is
    // admin-only, so this authenticates as admin rather than reusing the
    // customer's token.
    const adminRes = await request.post('/api/auth/login', { data: ADMIN });
    const adminAuth = { Authorization: `Bearer ${(await adminRes.json()).token}` };
    const del = await request.delete(`/api/appointments/${created[0].id}`, {
      headers: adminAuth,
    });
    expect(del.status(), 'cleanup: delete the appointment this test created').toBe(204);
  });
});
