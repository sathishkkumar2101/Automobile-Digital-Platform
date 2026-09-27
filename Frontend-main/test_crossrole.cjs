/**
 * Cross-role data flow: customer → dealer → admin and back.
 *
 * The suites alongside this one each exercise one service or one page. None of
 * them followed a single record across roles, which is why two defects survived
 * a fully green run:
 *
 *  1. Appointments were written with the account id (`users.id`) but stored rows
 *     hold the customer profile id (`customers.id`). The two are different
 *     values. A customer filtering their own list by the account id therefore
 *     saw only the rows that same browser had just created, and every seeded or
 *     pre-existing booking was invisible. The customer booked a service, the
 *     dealer saw an unnamed customer, and the admin's per-customer drill-down
 *     showed nothing.
 *
 *  2. The dealer module deserialised the order service's enriched response into
 *     a DTO that had no fields for the customer or vehicle, so the enrichment
 *     was discarded in transit. Dealers saw `Customer #<uuid>` and a vehicle
 *     search box that could never match, while an admin reading the same order
 *     saw a full name and model.
 *
 * Every assertion below compares what one role sees against what another role
 * sees. A test that only checks a status code cannot detect either of those,
 * because both returned 200 the whole time.
 */

const http = require('http');

const HOST = '127.0.0.1';
const GATEWAY = 8080;

function request(path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: HOST,
        port: GATEWAY,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...headers,
        },
      },
      res => {
        let raw = '';
        res.on('data', c => (raw += c));
        res.on('end', () => {
          let parsed = null;
          try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = raw; }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function login(email, password) {
  const res = await request('/api/auth/login', { method: 'POST', body: { email, password } });
  if (res.status !== 200 || !res.body || !res.body.token) {
    throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { Authorization: `Bearer ${res.body.token}` };
}

let pass = 0, fail = 0;
function check(label, ok, extra = '') {
  if (ok) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}${extra ? ' — ' + extra : ''}`); }
}

function section(title) {
  console.log(`\n--- ${title} ---`);
}

/** Accepts either a bare array or a Spring page envelope. */
function asList(body) {
  if (Array.isArray(body)) return body;
  if (body && Array.isArray(body.content)) return body.content;
  return [];
}

const uniq = Date.now();

async function run() {
  const admin = await login('admin@bmwtechworks.com', 'Admin@123');

  // ───────────────────────────────────────────────────────────────────────────
  section('Setup: register a customer and give it a profile');
  // ───────────────────────────────────────────────────────────────────────────

  const email = `crossrole-${uniq}@example.com`;
  const username = `crossrole-${uniq}`;
  const password = 'CrossRole@12345';

  // Self-registration, as the sign-up form does it. The service forces the role
  // to CUSTOMER and returns the account id, which is the value the gateway will
  // later present as X-User-Id.
  const reg = await request('/api/users', {
    method: 'POST',
    body: { username, name: 'Cross Role Probe', email, password, role: 'CUSTOMER' },
  });
  check('self-registration returns 201', reg.status === 201,
    `got ${reg.status} ${JSON.stringify(reg.body)}`);

  const userId = reg.body?.id;
  check('registration returned the account id', !!userId, JSON.stringify(reg.body));
  check('registration is forced to CUSTOMER', reg.body?.role === 'CUSTOMER', reg.body?.role);

  const customer = await login(email, password);

  // Onboard through the endpoint the signup gate calls.
  const profile = await request('/api/v1/customers', {
    method: 'POST',
    headers: customer,
    body: {
      name: 'Cross Role Probe',
      email,
      phone: '+91 90000 12345',
      address: ['1 Test Lane', 'Chennai, Tamil Nadu'],
    },
  });
  check('onboarding POST returns 201', profile.status === 201,
    `got ${profile.status} ${JSON.stringify(profile.body)}`);

  const profileId = profile.body?.id;
  check('profile response carries the profile id', !!profileId, JSON.stringify(profile.body));
  check('profile is bound to the account', profile.body?.userId === userId,
    `${profile.body?.userId} vs ${userId}`);
  check('profile id and account id are genuinely different values',
    !!profileId && !!userId && profileId !== userId,
    `account=${userId} profile=${profileId}`);

  // The account id is what the gateway puts in X-User-Id. If the booking path
  // used it as customerId, every assertion below would still return 200.
  const meAsCustomer = await request('/api/appointments', { headers: customer });
  check('new customer can read its own appointment list', meAsCustomer.status === 200,
    `got ${meAsCustomer.status} ${JSON.stringify(meAsCustomer.body)}`);
  check('a profile with no bookings returns an empty list, not an error',
    meAsCustomer.status === 200 && asList(meAsCustomer.body).length === 0,
    `got ${asList(meAsCustomer.body).length} rows`);

  // ───────────────────────────────────────────────────────────────────────────
  section('Appointments: the stored id must be the profile id');
  // ───────────────────────────────────────────────────────────────────────────

  const dealersRes = await request('/dealers', { headers: customer });
  const dealerId = asList(dealersRes.body)[0]?.dealerId;
  check('found a dealer to book against', !!dealerId, JSON.stringify(dealersRes.body).slice(0, 200));

  // Deliberately send a bogus customerId. The server must ignore it and use the
  // authenticated caller, otherwise a booking can be filed under any account.
  const sentinelCustomerId = '00000000-0000-0000-0000-0000000000ff';

  const booked = await request('/api/appointments', {
    method: 'POST',
    headers: customer,
    body: {
      customerId: sentinelCustomerId,
      dealerId,
      vehicleId: null,
      serviceType: 'GENERAL_SERVICE',
    },
  });
  check('booking succeeds', booked.status === 200 || booked.status === 201,
    `got ${booked.status} ${JSON.stringify(booked.body)}`);

  check('server ignored the client-supplied customerId',
    booked.body?.customerId === profileId,
    `stored customerId=${booked.body?.customerId}, expected profile ${profileId}`);

  check('the booking is attributed to the named customer, not the sentinel',
    booked.body?.customer?.name === 'Cross Role Probe',
    `customer=${JSON.stringify(booked.body?.customer)}`);

  const myAppts = await request('/api/appointments', { headers: customer });
  const mine = asList(myAppts.body);
  check('customer sees the booking it just made', mine.length === 1, `got ${mine.length} rows`);
  check('the row it sees is the same appointment the dealer and admin will see',
    mine[0]?.id === booked.body?.id, `mine=${mine[0]?.id} booked=${booked.body?.id}`);

  // ───────────────────────────────────────────────────────────────────────────
  section('Appointments: seeded history is visible to its owner');
  // ───────────────────────────────────────────────────────────────────────────

  // The seeded customer is the regression case: it owns rows that were written
  // before any of this code ran. If the read path filters by the account id
  // these rows stay hidden no matter how many bookings the browser creates.
  const seed = await login('customer1@bmwtechworks.com', 'Customer@123').catch(() => null);

  if (seed) {
    const seededProfile = await request('/api/v1/customers/me', { headers: seed });
    const seededProfileId = seededProfile.body?.id;

    const seedVisible = await request('/api/appointments', { headers: seed });
    const seedRows = asList(seedVisible.body);
    const owned = seedRows.filter(a => a.customerId === seededProfileId);

    check('seeded customer profile resolves from its own token', !!seededProfileId,
      JSON.stringify(seededProfile.body).slice(0, 200));
    check('seeded customer sees its pre-existing appointments', seedRows.length > 0,
      'expected the seeded rows to be visible, got an empty list');
    check('every visible row belongs to the seeded profile',
      seedRows.length === owned.length,
      `${seedRows.length} visible, ${owned.length} owned by ${seededProfileId}`);

    const asAdmin = await request('/api/appointments', { headers: admin });
    const adminRows = asList(asAdmin.body);
    const adminSeesSeed = adminRows.some(a => a.customerId === seededProfileId);

    check('admin sees the same seeded rows the customer now sees',
      adminSeesSeed === (seedRows.length > 0),
      `admin sees seeded=${adminSeesSeed}, customer sees=${seedRows.length}`);

    // The customer-facing filter must not be a subset that differs from admin's
    // view of that customer — that divergence was the bug.
    const adminCountForSeed = adminRows.filter(a => a.customerId === seededProfileId).length;
    check('customer and admin agree on the row count for the same customer',
      adminCountForSeed === seedRows.length,
      `admin=${adminCountForSeed} customer=${seedRows.length}`);
  } else {
    console.log('  SKIP  seeded customer login unavailable; seed visibility unchecked');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('Admin drill-down: a customer\'s own history must resolve');
  // ───────────────────────────────────────────────────────────────────────────

  const viaAdmin = await request(`/api/appointments/customers/${profileId}`, { headers: admin });
  const drillRows = asList(viaAdmin.body);
  check('admin can list this customer\'s appointments by profile id', viaAdmin.status === 200,
    `got ${viaAdmin.status} ${JSON.stringify(viaAdmin.body)}`);
  check('the drill-down finds the appointment the customer booked',
    drillRows.some(a => a.id === booked.body?.id),
    `drill-down returned ${drillRows.length} rows`);

  // ───────────────────────────────────────────────────────────────────────────
  section('Dealer orders: enrichment must survive the dealer hop');
  // ───────────────────────────────────────────────────────────────────────────

  // `/dealers/orders/{id}` resolves the dealer from the caller's own token and
  // rejects anyone else, so this has to be exercised as the dealer. Reading it
  // as an admin 404s and would have made the enrichment look untestable.
  const dealerAuth = await login('dealer1@bmwtechworks.com', 'Dealer@123').catch(() => null);
  const meDealer = dealerAuth
    ? await request('/dealers/me', { headers: dealerAuth })
    : { body: null };
  const myDealerId = meDealer.body?.dealerId;

  check('dealer can resolve its own dealer record', !!myDealerId,
    JSON.stringify(meDealer.body).slice(0, 200));

  const ordersForDealer = dealerAuth && myDealerId
    ? await request(`/dealers/orders/${myDealerId}`, { headers: dealerAuth })
    : { status: 0, body: [] };
  const dealerOrders = asList(ordersForDealer.body);

  check('dealer can list its own orders', ordersForDealer.status === 200,
    `got ${ordersForDealer.status} ${JSON.stringify(ordersForDealer.body).slice(0, 200)}`);

  if (dealerOrders.length === 0) {
    console.log('  SKIP  this dealer has no orders; enrichment shape unchecked');
  } else {
    const withCustomer = dealerOrders.filter(o => o.customer && o.customer.name);
    const withVehicle = dealerOrders.filter(o => o.vehicle && o.vehicle.model);

    check('every dealer order carries a resolved customer name',
      withCustomer.length === dealerOrders.length,
      `${withCustomer.length}/${dealerOrders.length} resolved` +
      ` — unresolved: ${JSON.stringify(dealerOrders.filter(o => !(o.customer && o.customer.name))
        .map(o => ({ id: o.id, customerId: o.customerId })))}`);

    check('every dealer order carries a resolved vehicle model',
      withVehicle.length === dealerOrders.length,
      `${withVehicle.length}/${dealerOrders.length} resolved`);

    // The same order, read by an admin, must agree. Disagreement is the
    // signature of the dealer DTO narrowing the enriched payload.
    const adminOrders = asList((await request('/api/v1/orders', { headers: admin })).body);
    const sample = dealerOrders[0];
    const adminCopy = adminOrders.find(o => o.id === sample.id);

    if (adminCopy) {
      check('dealer and admin agree on the customer name for the same order',
        adminCopy.customer?.name === sample.customer?.name,
        `dealer=${sample.customer?.name} admin=${adminCopy.customer?.name}`);
      check('dealer and admin agree on the vehicle model for the same order',
        adminCopy.vehicle?.model === sample.vehicle?.model,
        `dealer=${sample.vehicle?.model} admin=${adminCopy.vehicle?.model}`);
    } else {
      console.log(`  SKIP  order ${sample.id} absent from the admin list`);
    }

    // The dealer's model search depends on vehicle.model being present.
    //
    // This was `... || o.vehicle.model.toLowerCase().includes('bmw'.slice(0, 1))
    // || typeof o.vehicle.model === 'string'`, whose last clause is true whenever
    // a model exists at all, so `every()` was always true and the check could
    // not fail. The claim worth making is the one the search relies on: an order
    // that carries a vehicle must carry a non-empty model string, because a null
    // or blank model is exactly what makes the filter silently drop the order.
    const badModels = dealerOrders
      .filter(o => o.vehicle)
      .filter(o => typeof o.vehicle.model !== 'string' || o.vehicle.model.trim() === '')
      .map(o => `${o.id}:${JSON.stringify(o.vehicle.model)}`);
    check('vehicle model is a non-empty searchable string on every dealer order',
      badModels.length === 0,
      badModels.length ? badModels.slice(0, 3).join(', ') : '');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('Status propagation: dealer update must reach customer and admin');
  // ───────────────────────────────────────────────────────────────────────────

  if (dealerOrders.length > 0 && dealerAuth && myDealerId) {
    const target = dealerOrders[0];
    const before = target.status;

    const updated = await request(`/dealers/orders/${target.id}`, {
      method: 'PUT',
      headers: dealerAuth,
      body: { status: 'IN_PRODUCTION' },
    });
    check('dealer can move an order to IN_PRODUCTION',
      updated.status === 200 || updated.status === 204,
      `got ${updated.status} ${JSON.stringify(updated.body)}`);

    const reread = asList((await request(`/dealers/orders/${myDealerId}`, { headers: dealerAuth })).body);
    const after = reread.find(o => o.id === target.id);
    check('the new status is what the dealer sees on re-read',
      after?.status === 'IN_PRODUCTION', `status=${after?.status} (was ${before})`);

    // The same record read as an admin must agree, otherwise the two roles are
    // looking at different views of the same order.
    const adminView = asList((await request('/api/v1/orders', { headers: admin })).body)
      .find(o => o.id === target.id);
    check('admin sees the same status the dealer just set',
      adminView?.status === 'IN_PRODUCTION',
      `admin=${adminView?.status} dealer=${after?.status}`);

    check('the update did not strip the enrichment it had before',
      !!after?.customer?.name && !!after?.vehicle?.model,
      `customer=${after?.customer?.name} vehicle=${after?.vehicle?.model}`);

    // A dealer must not be able to reassign an order by writing those fields.
    const hijack = await request(`/dealers/orders/${target.id}`, {
      method: 'PUT',
      headers: dealerAuth,
      body: {
        status: 'IN_PRODUCTION',
        dealerId: '00000000-0000-0000-0000-0000000000ff',
        totalAmount: 1,
      },
    });
    const afterHijack = asList((await request(`/dealers/orders/${myDealerId}`, { headers: dealerAuth })).body)
      .find(o => o.id === target.id);
    check('a dealer cannot reassign the order by writing dealerId in the body',
      hijack.status >= 200 && hijack.status < 300
        && afterHijack?.dealerId === myDealerId
        && Number(afterHijack?.totalAmount) !== 1,
      `status=${hijack.status} dealerId=${afterHijack?.dealerId} total=${afterHijack?.totalAmount}`);

    // Put the seed back the way it was found. Leaving a seeded order in
    // IN_PRODUCTION changes the fixture for every later run, and the status
    // transition guards above are only meaningful against a known starting
    // point.
    const restore = await request(`/dealers/orders/${target.id}`, {
      method: 'PUT',
      headers: dealerAuth,
      body: { status: before },
    });
    const restored = asList((await request(`/dealers/orders/${myDealerId}`, { headers: dealerAuth })).body)
      .find(o => o.id === target.id);
    check('the order status is restored to its seeded value',
      restore.status >= 200 && restore.status < 300 && restored?.status === before,
      `status=${restored?.status}, expected ${before}`);
  } else {
    console.log('  SKIP  dealer session or orders unavailable; status propagation unchecked');
  }

  // ───────────────────────────────────────────────────────────────────────────
  section('Cleanup');
  // ───────────────────────────────────────────────────────────────────────────

  const del = await request(`/api/users/${userId}`, { method: 'DELETE', headers: admin });
  check('probe account deleted', del.status === 204 || del.status === 200, `got ${del.status}`);

  // The appointment service holds no foreign key to the customer service, so
  // deleting the account does not remove the row booked above — it would be
  // left behind as an orphan and accumulate on every run. Deletion is
  // admin-only, so this uses the admin token.
  if (booked.body?.id) {
    const delAppt = await request(`/api/appointments/${booked.body.id}`,
      { method: 'DELETE', headers: admin });
    check('probe appointment deleted', delAppt.status === 204 || delAppt.status === 200,
      `got ${delAppt.status}`);
  } else {
    check('probe appointment deleted', false, 'no booking id to clean up');
  }

  const profiles = asList((await request('/api/v1/customers', { headers: admin })).body);
  check('probe profile cascaded away with the account',
    !profiles.some(c => c.userId === userId));

  console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
