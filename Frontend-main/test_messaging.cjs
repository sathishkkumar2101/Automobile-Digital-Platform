const http = require('http');
const { Client } = require('@stomp/stompjs');

/**
 * Every conversation this script creates is recorded here and removed again
 * before it exits.
 *
 * The suite used to create a thread with the fixed title 'E2E Test Thread' and
 * never remove it, so each run added another one to a database that every other
 * suite and the browser tests share. That is not cosmetic: the messaging service
 * resolves every participant of every listed conversation through a per-
 * participant call to the user-role service, and the customer account is a
 * participant in all of them, so the list endpoint's cost grew with the number
 * of runs. It was also the reason the Playwright messaging suite became flaky
 * under parallel workers — the list took long enough that a freshly created
 * thread had not appeared when the test went looking for it.
 */
const createdConversations = [];

/** Titles this suite and the Playwright spec use, for reporting on leftovers. */
const TEST_TITLE_PREFIXES = [
  'E2E Test Thread',
  'Count Thread-',
  'Exchange-',
  'Inbox Thread-',
  'Isolated-',
];

function isTestTitle(title) {
  return typeof title === 'string' && TEST_TITLE_PREFIXES.some((p) => title.startsWith(p));
}

// ---- Tiny HTTP helper (via API Gateway :8080) ----
function request(method, path, token, data) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = {
      hostname: 'localhost',
      port: 8080,
      path,
      method,
      headers,
    };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function login(email, password) {
  const r = await request('POST', '/api/auth/login', null, { email, password });
  if (r.status === 200 && r.body && r.body.token) return r.body;
  throw new Error(`login failed for ${email}: ${r.status} ${JSON.stringify(r.body)}`);
}

// ---- STOMP helper (via nginx :3000/ws) ----
function stompClient(token) {
  const brokerURL = `ws://localhost:3000/ws?token=${encodeURIComponent(token)}`;
  const c = new Client({
    brokerURL,
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 0,
    heartbeatIncoming: 0,
    heartbeatOutgoing: 0,
    debug: () => {},
    webSocketFactory: () => new WebSocket(brokerURL),
  });
  return c;
}

function waitFor(buffer, predicate, timeoutMs) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = () => {
      const idx = buffer.findIndex(predicate);
      if (idx >= 0) {
        const v = buffer.splice(idx, 1)[0];
        return resolve(v);
      }
      if (Date.now() - started > timeoutMs) return reject(new Error('timeout waiting for event'));
      setTimeout(poll, 100);
    };
    poll();
  });
}

function connect(c) {
  return new Promise((resolve, reject) => {
    // The timer must be cleared on success. Left running it fires 15s later and
    // keeps the event loop alive, so the process sits there after the results
    // have been printed and Ctrl-C is the only way out.
    const timer = setTimeout(() => reject(new Error('connect timeout')), 15000);
    c.onConnect = () => {
      clearTimeout(timer);
      resolve();
    };
    c.onWebSocketError = (e) => {
      clearTimeout(timer);
      reject(new Error('websocket error ' + e));
    };
    c.onStompError = (f) => {
      clearTimeout(timer);
      reject(new Error('stomp error ' + (f.headers && f.headers.message)));
    };
    c.activate();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { console.log(`  ✅ ${name}`); pass++; }
  else { console.log(`  ❌ ${name}`); fail++; }
}

async function runPhases() {
  console.log('\n=== [1] LOGIN (gateway :8080) ===');
  const admin = await login('admin@bmwtechworks.com', 'Admin@123');
  const customer = await login('customer1@bmwtechworks.com', 'Customer@123');
  const dealer = await login('dealer1@bmwtechworks.com', 'Dealer@123');
  check('admin login', !!admin.token);
  check('customer login', !!customer.token);
  check('dealer login', !!dealer.token);

  const me = await request('GET', '/api/users/me', customer.token);
  check('customer /me', me.status === 200 && !!me.body.id);
  const myId = me.body.id;
  const adminMe = await request('GET', '/api/users/me', admin.token);
  const dealerMe = await request('GET', '/api/users/me', dealer.token);
  const adminUserId = adminMe.body.id;
  const dealerUserId = dealerMe.body.id;

  console.log('\n=== [2] CREATE CONVERSATION (customer -> dealer) ===');
  const dealers = await request('GET', '/dealers', customer.token);
  const list = Array.isArray(dealers.body) ? dealers.body : (dealers.body && dealers.body.content) || [];
  const dealerEntity = list.find((x) => x.userId && x.userId === dealerUserId) || list[0];
  check('dealers list available', list.length > 0);
  const dealerId = dealerEntity && dealerEntity.dealerId;

  // Unique per run. A fixed title would make the thread this suite creates
  // indistinguishable from the ones earlier runs left behind, so the leftover
  // report below could not tell "mine, cleaned up" from "theirs, still there".
  const threadTitle = `E2E Test Thread ${Date.now()}`;

  const conv = await request('POST', '/api/messages/conversations', customer.token, {
    contextType: 'GENERAL',
    title: threadTitle,
    dealerId,
  });
  check('create conversation -> 201', conv.status === 201);
  const convId = conv.body && conv.body.conversationId;
  check('conversation id returned', !!convId);
  if (convId) createdConversations.push(convId);
  const participantIds = (conv.body && conv.body.participants || []).map((p) => p.userId);
  check('admin auto-participant', participantIds.some((id) => id === adminUserId));
  check('dealer participant present', participantIds.includes(dealerUserId));
  check('customer participant present', participantIds.includes(myId));

  console.log('\n=== [3] LIST CONVERSATIONS PER ROLE ===');
  const custList = await request('GET', '/api/messages/conversations', customer.token);
  check('customer sees thread', (custList.body.items || []).some((c) => c.conversationId === convId));
  const dealList = await request('GET', '/api/messages/conversations', dealer.token);
  check('dealer sees thread', (dealList.body.items || []).some((c) => c.conversationId === convId));
  const adminList = await request('GET', '/api/messages/conversations?contextType=GENERAL', admin.token);
  check('admin filtered list sees thread', (adminList.body.items || []).some((c) => c.conversationId === convId));

  console.log('\n=== [4] REST SEND + HISTORY ===');
  const m1 = await request('POST', '/api/messages/send', customer.token, {
    conversationId: convId,
    content: 'Hello dealer, from customer',
  });
  check('customer sends -> 200', m1.status === 200 && !!m1.body.id);
  const m2 = await request('POST', '/api/messages/send', dealer.token, {
    conversationId: convId,
    content: 'Hello customer, from dealer reply',
  });
  check('dealer sends -> 200', m2.status === 200 && !!m2.body.id);

  const history = await request('GET', `/api/messages/conversations/${convId}/messages?page=0&size=30`, customer.token);
  const msgs = (history.body && history.body.content) || [];
  check('history has 2 messages', msgs.length >= 2);
  const asc = msgs.slice().reverse();
  check('history ascending order', asc.length >= 2 && asc[0].content.includes('Hello dealer'));
  const dealListAfter = await request('GET', '/api/messages/conversations', dealer.token);
  check('dealer unread incremented for customer thread', (dealListAfter.body.items.find((c) => c.conversationId === convId) || {}).unreadCount > 0);

  const read = await request('PUT', `/api/messages/conversations/${convId}/read`, customer.token);
  check('customer marks thread read', read.status === 200 && read.body.unreadCount === 0);

  console.log('\n=== [5] STOMP REALTIME (via nginx :3000/ws) ===');
  const cCust = stompClient(customer.token);
  const cDealer = stompClient(dealer.token);
  const custMsgs = [], custRead = [], custTyping = [];
  const dealMsgs = [], dealRead = [], dealTyping = [], dealAck = [];

  connect(cCust);
  await sleep(500);
  connect(cDealer);
  await sleep(800);

  const sub = (c, dest, buf) => c.subscribe(dest, (frame) => {
    try {
      const p = JSON.parse(frame.body);
      const t = p.type;
      if (t === 'MESSAGE') buf.push(p.message);
      else if (t === 'READ') buf.push(p);
      else if (t === 'TYPING') buf.push(p);
    } catch { /* ignore non-event frames */ }
  });

  sub(cCust, '/user/queue/messages', custMsgs);
  sub(cCust, '/user/queue/read', custRead);
  sub(cCust, '/user/queue/typing', custTyping);
  sub(cDealer, '/user/queue/messages', dealMsgs);
  sub(cDealer, '/user/queue/read', dealRead);
  sub(cDealer, '/user/queue/typing', dealTyping);
  cDealer.subscribe('/user/queue/read-ack', (f) => { try { dealAck.push(JSON.parse(f.body)); } catch {} });
  await sleep(500);

  // 5a. dealer REST message pushed to customer over WS
  await request('POST', '/api/messages/send', dealer.token, { conversationId: convId, content: 'E2E ping' });
  const ping = await waitFor(custMsgs, (m) => m.content === 'E2E ping', 10000);
  check('customer receives WS push (dealer -> customer)', ping && ping.conversationId === convId);

  // 5b. customer REST message pushed to dealer over WS
  await request('POST', '/api/messages/send', customer.token, { conversationId: convId, content: 'E2E pong' });
  const pong = await waitFor(dealMsgs, (m) => m.content === 'E2E pong', 10000);
  check('dealer receives WS push (customer -> dealer)', pong && pong.conversationId === convId);

  // 5c. typing indicator: dealer -> customer
  cDealer.publish({ destination: '/app/typing', body: JSON.stringify({ conversationId: convId, typing: true }) });
  const typing = await waitFor(custTyping, (e) => e.typing === true, 10000);
  check('customer receives TYPING from dealer', typing && typing.conversationId === convId && typing.userId === dealerUserId);

  // 5d. read receipt: dealer marks read via STOMP -> customer gets READ + dealer gets ack
  cDealer.publish({ destination: '/app/msg/read', body: JSON.stringify({ conversationId: convId }) });
  const readEvt = await waitFor(custRead, (e) => e.readerUserId === dealerUserId, 10000);
  check('customer receives READ event (dealer read)', readEvt && readEvt.conversationId === convId);
  const ack = await waitFor(dealAck, (n) => typeof n === 'number', 10000);
  check('dealer receives read-ack', ack !== undefined);

  cCust.deactivate();
  cDealer.deactivate();

  // ---------------------------------------------------------------------
  // [6] ADMIN DELETES A CONVERSATION
  //
  // A thread is the only record of a complaint, a quote negotiation or a
  // support history. There is no way to remove one, so nothing can be
  // retracted and the shared list only ever grows. Deletion is therefore
  // ADMIN-only — a participant deleting a thread would destroy the other
  // participant's copy of the conversation too, which is not theirs to
  // remove.
  // ---------------------------------------------------------------------
  console.log('\n=== [6] DELETE CONVERSATION (admin only) ===');

  const doomed = await request('POST', '/api/messages/conversations', customer.token, {
    contextType: 'GENERAL',
    title: `E2E Test Thread ${Date.now()} doomed`,
    dealerId,
  });
  check('create throwaway thread -> 201', doomed.status === 201);
  const doomedId = doomed.body && doomed.body.conversationId;
  if (doomedId) createdConversations.push(doomedId);

  // Give it a message, so "deleted" can be asserted on the children too and not
  // only on the thread row itself.
  await request('POST', '/api/messages/send', customer.token, {
    conversationId: doomedId,
    content: 'this message must disappear with the thread',
  });

  // Authorization first, on a thread that must survive the attempt.
  const delDealer = await request('DELETE', `/api/messages/conversations/${doomedId}`, dealer.token);
  check('DEALER participant cannot delete -> 403', delDealer.status === 403);
  const delCust = await request('DELETE', `/api/messages/conversations/${doomedId}`, customer.token);
  check('CUSTOMER participant cannot delete -> 403', delCust.status === 403);
  const delAnon = await request('DELETE', `/api/messages/conversations/${doomedId}`, null);
  check('unauthenticated delete -> 401', delAnon.status === 401);

  const stillThere = await request('GET', '/api/messages/conversations', customer.token);
  check(
    'thread survives the refused deletes',
    (stillThere.body.items || []).some((c) => c.conversationId === doomedId),
  );

  const delMissing = await request(
    'DELETE',
    '/api/messages/conversations/00000000-0000-0000-0000-000000000000',
    admin.token,
  );
  check('admin delete of unknown id -> 404', delMissing.status === 404);

  const delAdmin = await request('DELETE', `/api/messages/conversations/${doomedId}`, admin.token);
  check('ADMIN delete -> 204', delAdmin.status === 204);

  const afterDelete = await request('GET', '/api/messages/conversations', customer.token);
  check(
    'deleted thread is gone from the customer list',
    !(afterDelete.body.items || []).some((c) => c.conversationId === doomedId),
  );
  const afterDeleteDealer = await request('GET', '/api/messages/conversations', dealer.token);
  check(
    'deleted thread is gone from the dealer list',
    !(afterDeleteDealer.body.items || []).some((c) => c.conversationId === doomedId),
  );
  // The messages and read-receipts have to go with it. A thread row removed
  // while its messages survive leaves rows that nothing can ever reach again.
  const goneHistory = await request(
    'GET',
    `/api/messages/conversations/${doomedId}/messages?page=0&size=30`,
    customer.token,
  );
  check('deleted thread history is not readable -> 404', goneHistory.status === 404);
  if (doomedId) {
    const idx = createdConversations.indexOf(doomedId);
    if (idx >= 0) createdConversations.splice(idx, 1);
  }

  // ---------------------------------------------------------------------
  // [7] SERVICE TYPES
  //
  // The booking form used to offer a hardcoded list that the backend never
  // validated against, so a customer could book a 'BODYWORK' service that
  // does not exist as an entity anywhere. The list has to come from the same
  // table the appointment writes to, and the write has to reject values the
  // table does not contain.
  // ---------------------------------------------------------------------
  console.log('\n=== [7] SERVICE TYPES ===');

  const CANONICAL = [
    'REGULAR_SERVICE',
    'OIL_CHANGE',
    'BRAKE_SERVICE',
    'FULL_SERVICE',
    'AC_SERVICE',
    'ENGINE_SERVICE',
    'TYRE_SERVICE',
  ];

  const stRes = await request('GET', '/api/appointments/service-types', customer.token);
  check('GET /api/appointments/service-types -> 200', stRes.status === 200);
  const stBody = stRes.body;
  const stList = Array.isArray(stBody)
    ? stBody
    : (stBody && (stBody.content || stBody.items || stBody.serviceTypes)) || [];
  const stNames = stList.map((x) => (typeof x === 'string' ? x : x.code || x.name));
  check('service types returned as a list', Array.isArray(stList) && stList.length > 0);
  check('service types are exactly the seven canonical values',
    CANONICAL.every((c) => stNames.includes(c)) && stNames.length === CANONICAL.length);
  check('no fictional types offered (BODYWORK/PAINT/DIAGNOSTICS/PICKUP/DETAILING)',
    !['BODYWORK', 'PAINT', 'DIAGNOSTICS', 'PICKUP', 'DETAILING'].some((x) => stNames.includes(x)));

  // The write path has to agree with the read path.
  const myAppts = await request('GET', '/api/appointments', customer.token);
  const apptList = Array.isArray(myAppts.body)
    ? myAppts.body
    : (myAppts.body && (myAppts.body.content || myAppts.body.items)) || [];
  const apptId = apptList[0] && (apptList[0].appointmentId || apptList[0].id);
  check('customer has an appointment to retype', !!apptId);

  if (apptId) {
    const badType = await request(
      'PATCH',
      `/api/appointments/${apptId}/service-type?serviceType=BODYWORK`,
      customer.token,
    );
    check('invalid service type -> 400 (not silently accepted)', badType.status === 400);

    const goodType = await request(
      'PATCH',
      `/api/appointments/${apptId}/service-type?serviceType=OIL_CHANGE`,
      customer.token,
    );
    check('valid service type -> 200', goodType.status === 200);

    const reread = await request('GET', `/api/appointments/${apptId}`, customer.token);
    const rereadBody = reread.body || {};
    const rereadType = rereadBody.serviceType && (rereadBody.serviceType.code || rereadBody.serviceType);
    check('appointment persisted the new service type', rereadType === 'OIL_CHANGE');
  }
}

/**
 * Remove every conversation this run created, then report what earlier runs
 * left behind.
 *
 * The report is not decoration. The admin-only delete endpoint is what makes
 * this possible at all, so until Phase 3 lands the DELETE calls here fail and
 * the leftovers keep growing — which is exactly what the run should say rather
 * than quietly leaving behind.
 */
async function cleanup(adminToken) {
  console.log('\n=== [8] CLEANUP ===');
  if (!adminToken) {
    console.log('  ⚠️  no admin token; cannot clean up');
    return;
  }
  for (const id of createdConversations) {
    const r = await request('DELETE', `/api/messages/conversations/${id}`, adminToken);
    if (r.status !== 204) {
      console.log(`  ⚠️  could not remove ${id} -> ${r.status}`);
    }
  }
  console.log(`  requested removal of ${createdConversations.length} thread(s)`);

  const list = await request('GET', '/api/messages/conversations?contextType=GENERAL', adminToken);
  const items = (list.body && list.body.items) || [];
  const leftovers = items.filter((c) => isTestTitle(c.title));
  console.log(`  ${leftovers.length} test-titled thread(s) still in the database:`);
  for (const c of leftovers.slice(0, 40)) console.log(`    ${c.title}`);
  if (leftovers.length > 40) console.log(`    ... and ${leftovers.length - 40} more`);
  console.log(`  ${items.length - leftovers.length} non-test GENERAL thread(s) left untouched`);
}

async function run() {
  let adminToken = null;
  try {
    adminToken = (await login('admin@bmwtechworks.com', 'Admin@123')).token;
  } catch { /* the login phase reports this properly */ }
  try {
    await runPhases();
  } finally {
    // Always runs, so a failure partway through does not leave a thread behind.
    try {
      await cleanup(adminToken);
    } catch (e) {
      console.log(`  ⚠️  cleanup failed: ${e.message}`);
    }
    console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
  }
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });