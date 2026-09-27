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
  else { fail++; console.log(`  FAIL  ${label} ${extra}`); }
}

const uniq = Date.now();

async function run() {
  const admin = await login('admin@bmwtechworks.com', 'Admin@123');

  // 1. Baseline: a freshly registered account has no customer profile.
  const email = `onboard-probe-${uniq}@example.com`;
  const username = `onboard-probe-${uniq}`;

  const reg = await request('/api/users', {
    method: 'POST',
    body: { username, name: 'Onboard Probe', email, password: 'Probe@12345', role: 'CUSTOMER' },
  });
  check('self-registration returns 201', reg.status === 201, `got ${reg.status}`);
  const userId = reg.body && reg.body.id;
  check('registration is forced to CUSTOMER', reg.body && reg.body.role === 'CUSTOMER', reg.body && reg.body.role);

  const custHeaders = { Authorization: (await login(email, 'Probe@12345')).Authorization };

  const meBefore = await request('/api/v1/customers/me', { headers: custHeaders });
  const emptyBefore = !meBefore.body || !meBefore.body.id;
  check('GET /customers/me shows no profile before onboarding', emptyBefore, JSON.stringify(meBefore.body));

  // 2. The onboarding form's exact POST body.
  const created = await request('/api/v1/customers', {
    method: 'POST',
    headers: custHeaders,
    body: {
      name: 'Onboard Probe',
      email,
      phone: '+91 90000 12345',
      address: ['12 MG Road', 'Bengaluru, Karnataka'],
    },
  });
  check('onboarding POST returns 201', created.status === 201, `got ${created.status} ${JSON.stringify(created.body)}`);
  check('created profile keeps the address', created.body && Array.isArray(created.body.address) && created.body.address.length === 2,
    JSON.stringify(created.body && created.body.address));
  check('created profile is bound to the caller userId', created.body && created.body.userId === userId,
    `${created.body && created.body.userId} vs ${userId}`);

  const meAfter = await request('/api/v1/customers/me', { headers: custHeaders });
  check('GET /customers/me now resolves the profile', !!(meAfter.body && meAfter.body.id), JSON.stringify(meAfter.body));

  // 3. A second POST for the same account must update, not duplicate.
  const second = await request('/api/v1/customers', {
    method: 'POST',
    headers: custHeaders,
    body: { name: 'Onboard Probe Again', email, phone: '+91 90000 99999' },
  });
  check('repeat onboarding POST returns 201', second.status === 201, `got ${second.status} ${JSON.stringify(second.body)}`);
  check('repeat onboarding POST updates the same row', second.body && second.body.id === created.body.id,
    `${second.body && second.body.id} vs ${created.body && created.body.id}`);
  check('repeat onboarding POST applied the new name', second.body && second.body.name === 'Onboard Probe Again',
    second.body && second.body.name);

  const afterRepeat = await request('/api/v1/customers', { headers: admin });
  const rowsForUser = Array.isArray(afterRepeat.body) ? afterRepeat.body.filter(c => c.userId === userId).length : -1;
  check('account still has exactly one profile row', rowsForUser === 1, `got ${rowsForUser}`);

  // 4. POST must not be able to hijack an existing row via a client-supplied id.
  const foreignId = created.body && created.body.id;
  const hijack = await request('/api/v1/customers', {
    method: 'POST',
    headers: { Authorization: admin.Authorization },
    body: { id: foreignId, name: 'Hijack', email: 'hijack@example.com' },
  });
  // ADMIN is refused POST by the gateway, so the id never reaches the service.
  check('gateway refuses an ADMIN creating a customer', hijack.status === 403, `got ${hijack.status}`);

  const stillOurs = await request('/api/v1/customers', { headers: admin });
  const intact = Array.isArray(stillOurs.body)
    && stillOurs.body.some(c => c.id === foreignId && c.name === 'Onboard Probe Again');
  check('existing profile was not overwritten', intact);

  // 4. The new cascade endpoint, called by user id.
  const before = await request('/api/v1/customers', { headers: admin });
  const existedBefore = Array.isArray(before.body) && before.body.some(c => c.userId === userId);
  check('profile is visible to ADMIN before delete', existedBefore);

  const del = await request(`/api/v1/customers/by-user/${userId}`, { method: 'DELETE', headers: admin });
  check('DELETE /customers/by-user/{userId} returns 204', del.status === 204, `got ${del.status} ${JSON.stringify(del.body)}`);

  const after = await request('/api/v1/customers', { headers: admin });
  const goneAfter = Array.isArray(after.body) && !after.body.some(c => c.userId === userId);
  check('profile is gone after the by-user delete', goneAfter);

  // 5. Idempotent: deleting again, and deleting an account that never onboarded.
  const again = await request(`/api/v1/customers/by-user/${userId}`, { method: 'DELETE', headers: admin });
  check('repeat by-user delete is still 204', again.status === 204, `got ${again.status}`);

  const noProfileUser = `onboard-noprofile-${uniq}@example.com`;
  const reg2 = await request('/api/users', {
    method: 'POST',
    body: { username: `onboard-noprofile-${uniq}`, name: 'No Profile', email: noProfileUser, password: 'Probe@12345', role: 'CUSTOMER' },
  });
  const noProfileId = reg2.body && reg2.body.id;
  const never = await request(`/api/v1/customers/by-user/${noProfileId}`, { method: 'DELETE', headers: admin });
  check('by-user delete on a never-onboarded account is 204', never.status === 204, `got ${never.status}`);

  // 6. Non-ADMIN must be refused.
  const dealer = await login('dealer1@bmwtechworks.com', 'Dealer@123');
  const forbidden = await request(`/api/v1/customers/by-user/${userId}`, { method: 'DELETE', headers: dealer });
  check('DEALER is refused the by-user delete', forbidden.status === 403, `got ${forbidden.status}`);

  // 7. A seeded customer is untouched by the probe.
  const seeded = await request('/api/v1/customers', { headers: admin });
  check('seeded customer1 profile still present',
    Array.isArray(seeded.body) && seeded.body.some(c => c.email === 'customer1@bmwtechworks.com'));
  check('seeded customer1 address still present',
    Array.isArray(seeded.body)
    && seeded.body.find(c => c.email === 'customer1@bmwtechworks.com').address.length === 2);

  // 9. The cascade: deleting the ACCOUNT must take its profile with it, with no
  //    second call from the client. Re-onboard first, because the by-user delete
  //    in step 4 already cleared this account's profile.
  const reOnboard = await request('/api/v1/customers', {
    method: 'POST',
    headers: custHeaders,
    body: {
      name: 'Cascade Probe',
      email,
      phone: '+91 91111 22222',
      // Carries an @ElementCollection, so this also exercises the collection
      // rows the profile delete has to clear along with the profile itself.
      address: ['5 Race Course Road', 'Chennai, Tamil Nadu'],
    },
  });
  check('re-onboarding before the account delete returns 201', reOnboard.status === 201, `got ${reOnboard.status}`);

  const beforeCascade = await request('/api/v1/customers', { headers: admin });
  const profilePresent = Array.isArray(beforeCascade.body)
    && beforeCascade.body.some(c => c.userId === userId);
  check('profile exists immediately before the account delete', profilePresent);

  // A single call. No /customers/by-user beforehand — that is the whole point.
  const cascadeDel = await request(`/api/users/${userId}`, { method: 'DELETE', headers: admin });
  check('deleting the account alone returns 204', cascadeDel.status === 204, `got ${cascadeDel.status} ${JSON.stringify(cascadeDel.body)}`);

  const afterCascade = await request('/api/v1/customers', { headers: admin });
  const orphanFree = Array.isArray(afterCascade.body)
    && !afterCascade.body.some(c => c.userId === userId);
  check('account delete cascaded, leaving no orphaned profile', orphanFree,
    JSON.stringify((afterCascade.body || []).filter(c => c.userId === userId)));

  // 10. An account that never onboarded still deletes cleanly: the cascade runs
  //     unconditionally, and the customer service treats "no profile" as a no-op.
  if (noProfileId) {
    const d = await request(`/api/users/${noProfileId}`, { method: 'DELETE', headers: admin });
    check('account with no profile still deletes', d.status === 204 || d.status === 200, `got ${d.status} ${JSON.stringify(d.body)}`);
  }

  console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
