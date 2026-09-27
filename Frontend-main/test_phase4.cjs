const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null });
        } catch (e) {
          resolve({ status: res.statusCode, body: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test through frontend Nginx proxy (port 3000) — NOT directly to Gateway (port 8080)
const HOST = '127.0.0.1';
const PORT = 3000;

async function login(email, password) {
  const res = await request({
    hostname: HOST, port: PORT, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email, password });
  if (res.status === 200 && res.body && res.body.token) {
    return { token: res.body.token, headers: { 'Authorization': `Bearer ${res.body.token}`, 'Content-Type': 'application/json' } };
  }
  return null;
}

async function get(path, headers) {
  return request({ hostname: HOST, port: PORT, path, method: 'GET', headers });
}

async function runTests() {
  let pass = 0, fail = 0;
  function check(name, condition) {
    if (condition) { console.log(`  ✅ ${name}`); pass++; }
    else { console.log(`  ❌ ${name}`); fail++; }
  }

  // === 1. Frontend serves HTML ===
  console.log('\n=== FRONTEND SPA ===');
  let html = await get('/', {});
  check('GET / returns 200', html.status === 200);
  check('GET / returns HTML', typeof html.body === 'string' && html.body.includes('<div id="root">'));

  let loginPage = await get('/login', {});
  check('GET /login returns 200 (SPA)', loginPage.status === 200);

  let customerDash = await get('/customer/dashboard', {});
  check('GET /customer/dashboard returns 200 (SPA)', customerDash.status === 200);

  let dealerDash = await get('/dealer/dashboard', {});
  check('GET /dealer/dashboard returns 200 (SPA)', dealerDash.status === 200);

  let adminDash = await get('/admin/dashboard', {});
  check('GET /admin/dashboard returns 200 (SPA)', adminDash.status === 200);

  // === 2. Authentication through Nginx proxy ===
  console.log('\n=== AUTHENTICATION (via port 3000 proxy) ===');
  const admin = await login('admin@bmwtechworks.com', 'Admin@123');
  check('Admin login succeeds', admin !== null);

  const customer = await login('customer1@bmwtechworks.com', 'Customer@123');
  check('Customer login succeeds', customer !== null);

  const dealer = await login('dealer1@bmwtechworks.com', 'Dealer@123');
  check('Dealer login succeeds', dealer !== null);

  let badLogin = await request({
    hostname: HOST, port: PORT, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'bad@example.com', password: 'wrong' });
  check('Invalid credentials rejected', badLogin.status === 401 || badLogin.status === 400 || badLogin.status === 500);

  // === 3. API data through Nginx proxy ===
  console.log('\n=== API DATA (via port 3000 proxy) ===');
  if (admin) {
    let vehicles = await get('/api/vehicles', admin.headers);
    check('Admin GET /api/vehicles -> 200', vehicles.status === 200);
    check('Admin vehicles is array', Array.isArray(vehicles.body));

    let orders = await get('/api/v1/orders', admin.headers);
    check('Admin GET /api/v1/orders -> 200', orders.status === 200);
    check('Admin orders is array', Array.isArray(orders.body));

    let appointments = await get('/api/appointments', admin.headers);
    check('Admin GET /api/appointments -> 200', appointments.status === 200);

    let users = await get('/api/users', admin.headers);
    check('Admin GET /api/users -> 200', users.status === 200);

    let customers = await get('/api/v1/customers', admin.headers);
    check('Admin GET /api/v1/customers -> 200', customers.status === 200);

    let dealers = await get('/dealers', admin.headers);
    check('Admin GET /dealers -> 200', dealers.status === 200);
  }

  if (customer) {
    let custOrders = await get('/api/v1/orders', customer.headers);
    check('Customer GET /api/v1/orders -> 200', custOrders.status === 200);
    check('Customer orders is array', Array.isArray(custOrders.body));

    let custAppts = await get('/api/appointments', customer.headers);
    check('Customer GET /api/appointments -> 200', custAppts.status === 200);

    let custVehicles = await get('/api/vehicles', customer.headers);
    check('Customer GET /api/vehicles -> 200', custVehicles.status === 200);
  }

  if (dealer) {
    // A DEALER must not be able to read the cross-role order feed. The gateway
    // scopes /api/v1/orders to the caller, and a dealership reads its own
    // orders through /dealers/orders/{dealerId} instead. Both halves are
    // asserted here so the rule cannot regress in either direction.
    let dealerOrders = await get('/api/v1/orders', dealer.headers);
    check('Dealer GET /api/v1/orders is refused -> 403', dealerOrders.status === 403);

    let ownDealer = await get('/dealers/me', dealer.headers);
    if (ownDealer.status === 200 && ownDealer.body && ownDealer.body.dealerId) {
      let ownOrders = await get(`/dealers/orders/${ownDealer.body.dealerId}`, dealer.headers);
      check('Dealer GET own /dealers/orders/{id} -> 200', ownOrders.status === 200);
    }

    let dealerAppts = await get('/api/appointments', dealer.headers);
    check('Dealer GET /api/appointments -> 200', dealerAppts.status === 200);
  }

  // === 4. Security regression (IDOR) ===
  console.log('\n=== SECURITY REGRESSION (IDOR via port 3000 proxy) ===');
  if (admin && customer) {
    // orders.customerId is the customer *profile* id, which is a different
    // value from the account's user id. Ownership has to be compared against
    // the caller's own profile, and the target order has to be one that is
    // genuinely not theirs -- picking an arbitrary order proves nothing.
    let me = await get('/api/v1/customers/me', customer.headers);
    let ownCustomerId = me.body && me.body.id;

    let allOrders = await get('/api/v1/orders', admin.headers);
    if (ownCustomerId && Array.isArray(allOrders.body) && allOrders.body.length > 0) {
      let ownOrder = allOrders.body.find(o => o.customerId === ownCustomerId);
      let otherOrder = allOrders.body.find(o => o.customerId !== ownCustomerId);

      if (ownOrder) {
        let mine = await get(`/api/v1/orders/${ownOrder.id}`, customer.headers);
        check(`Customer reads own order ${ownOrder.id} -> 200`, mine.status === 200);
      }

      if (otherOrder) {
        let idor = await get(`/api/v1/orders/${otherOrder.id}`, customer.headers);
        check(`Customer IDOR on someone else's order ${otherOrder.id} -> 403`,
          idor.status === 403);
      }
    }
  }

  // === 5. /api/users/me through proxy ===
  console.log('\n=== USER IDENTITY ===');
  if (admin) {
    let me = await get('/api/users/me', admin.headers);
    check('Admin /api/users/me -> 200', me.status === 200);
    if (me.status === 200) check('Admin email correct', me.body && me.body.email === 'admin@bmwtechworks.com');
  }
  if (customer) {
    let me = await get('/api/users/me', customer.headers);
    check('Customer /api/users/me -> 200', me.status === 200);
  }

  // === Summary ===
  console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
  process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(err => { console.error(err); process.exit(1); });
