const http = require('http');
const { Client } = require('@stomp/stompjs');

/**
 * Removes test-created conversations from the shared fixture database.
 *
 * The messaging suites create threads and, until the admin-only delete endpoint
 * existed, had no way to remove them. Every run therefore left a few more behind
 * until the fixture held roughly a hundred of them. The cost was not only the
 * rows: the messaging service resolves every participant of every listed
 * conversation through a per-participant call to the user-role service, and the
 * single shared customer account is a participant in all of them, so
 * `GET /api/messages/conversations` got slower with each run — which is what
 * made the Playwright messaging suite intermittently fail to find a thread it
 * had just created.
 *
 * What is removed is decided by title, and only titles carrying an explicit test
 * marker qualify. Conversations whose titles are real ("BMW Chennai", a
 * customer's name, an order reference) are reported and left alone, because a
 * title-based rule cannot tell a test's copy of a plausible name from a genuine
 * one, and guessing here would mean deleting a customer's history.
 *
 * Usage:
 *   node purge_test_conversations.cjs          report only, delete nothing
 *   node purge_test_conversations.cjs --apply  delete the marked threads
 */

const APPLY = process.argv.includes('--apply');

/** A title must start with one of these to be considered test-created. */
const TEST_TITLE_PREFIXES = [
  'E2E Test Thread',
  'Count Thread-',
  'Exchange-',
  'Inbox Thread-',
  'Isolated-',
  'Purge Probe-',
  // From the failure-state specs, which title their thread so the failure can be
  // told apart from a genuinely empty conversation.
  'Broken History-',
  // Debris from earlier manual debugging against the fixture.
  'Probe ',
  'Probe2 ',
  'Debug Thread',
  'Debug',
  'Shape Probe',
];

/**
 * Deliberately NOT in the list: "BMW Chennai".
 *
 * Dealer chats are titled with the dealer's name, so the threads this
 * repository's own dealer test creates are indistinguishable from a customer's
 * genuine conversation with that dealership. There are twelve of them and they
 * may well be real, so they are reported and left alone. A title rule that
 * guessed here would eventually delete somebody's history on the strength of
 * the word "BMW".
 */


function isTestTitle(title) {
  return typeof title === 'string' && TEST_TITLE_PREFIXES.some((p) => title.startsWith(p));
}

function call(method, path, token, data) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    let body = null;
    if (data) {
      body = JSON.stringify(data);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = http.request(
      { hostname: 'localhost', port: 8080, path, method, headers },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let parsed = raw;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            /* keep the raw text */
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const login = async (email, password) => {
    const res = await call('POST', '/api/auth/login', null, { email, password });
    if (res.status !== 200 || !res.body?.token) {
      throw new Error(`${email} login failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    return res.body.token;
  };

  const token = await login('admin@bmwtechworks.com', 'Admin@123');
  const customerToken = await login('customer1@bmwtechworks.com', 'Customer@123');

  /**
   * Collected from more than one signed-in account on purpose.
   *
   * A conversation's visibility is its participant list, and the create path
   * adds the platform ADMIN to every new thread — but older rows were written
   * before that was true, and two such threads were still in the fixture with
   * only the customer and the dealer on them. An ADMIN-scoped listing therefore
   * could not see them, so a purge built only on the admin's own view reported
   * a clean database while leaving exactly the debris it was looking for.
   *
   * Taking the union of both views costs one extra login and one extra set of
   * list calls, and closes the gap permanently rather than for today's rows.
   */
  const seen = new Map();
  const CONTEXT_TYPES = ['GENERAL', 'ORDER', 'VEHICLE', 'APPOINTMENT'];
  for (const who of [token, customerToken]) {
    for (const contextType of CONTEXT_TYPES) {
      const res = await call(
        'GET',
        `/api/messages/conversations?contextType=${contextType}`,
        who,
      );
      if (res.status !== 200) {
        console.log(`  ! ${contextType} list returned ${res.status}, skipping`);
        continue;
      }
      for (const c of res.body.items ?? []) seen.set(c.conversationId, c);
    }
  }

  const marked = [...seen.values()].filter((c) => isTestTitle(c.title));
  const keep = [...seen.values()].filter((c) => !isTestTitle(c.title));

  console.log(`\n${seen.size} conversation(s) found (union of the ADMIN and customer views)`);
  console.log(`  ${marked.length} test-created (title carries a test marker)`);
  console.log(`  ${keep.length} will be left untouched`);

  const byTitle = new Map();
  for (const c of keep) {
    const key = c.title ?? '(untitled)';
    byTitle.set(key, (byTitle.get(key) ?? 0) + 1);
  }
  console.log('\nTitles being preserved:');
  for (const [title, n] of [...byTitle.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)}  ${title}`);
  }

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to delete the marked threads.');
    return;
  }

  console.log(`\nDeleting ${marked.length} test-created thread(s)...`);
  let deleted = 0;
  const failed = [];
  for (const c of marked) {
    const res = await call('DELETE', `/api/messages/conversations/${c.conversationId}`, token);
    if (res.status === 204) {
      deleted += 1;
    } else {
      failed.push({ id: c.conversationId, title: c.title, status: res.status });
    }
    if ((deleted + failed.length) % 10 === 0) {
      process.stdout.write(`  ${deleted + failed.length}/${marked.length}\r`);
    }
  }
  process.stdout.write('\n');
  console.log(`  deleted ${deleted}, failed ${failed.length}`);
  for (const f of failed) console.log(`  ! ${f.title} (${f.id}) -> ${f.status}`);

  const after = await call('GET', '/api/messages/conversations?contextType=GENERAL', token);
  const remaining = after.body?.items?.length ?? 0;
  console.log(`\nGENERAL conversations remaining: ${remaining}`);

  // The whole point of the delete endpoint is that the suite can clean up after
  // itself, so confirm it works rather than assuming it.
  const probe = await call('POST', '/api/messages/conversations', token, {
    contextType: 'GENERAL',
    title: `Purge Probe-${Date.now()}`,
  });
  if (probe.status === 201) {
    const id = probe.body.conversationId;
    const gone = await call('DELETE', `/api/messages/conversations/${id}`, token);
    console.log(`self-cleanup check: create 201, delete -> ${gone.status} ${gone.status === 204 ? '(ok)' : '(BROKEN)'}`);
  } else {
    console.log(`self-cleanup check: create returned ${probe.status}, could not verify`);
  }
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
