import { test, expect, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';

/**
 * Messaging across all three roles, driven through the UI.
 *
 * This file exists because the messaging suite so far only spoke JSON. Every
 * request returned 200 and carried correct data while the screen was unusable:
 * the messaging service serialises a participant as `{userId, name, email, role}`
 * but the client typed it as `{id, name, email, roleName}`, so `p.roleName` was
 * undefined for every participant. `ChatPanel` rendered the role line with
 * `p.roleName.charAt(0)`, which threw a TypeError on every conversation, and
 * because nothing bounded the render the entire tree unmounted. Clicking any
 * "message" button set the selection before navigating, so the fault fired every
 * time rather than intermittently.
 *
 * The same mismatch also made `p.id !== meId` permanently true, so the signed-in
 * user was never filtered out of their own peer list and every conversation
 * claimed one more participant than it has. That one is asserted here too,
 * because it is wrong in exactly the same way but fails quietly.
 *
 * Two notes on how this file waits for things. It avoids
 * `waitForLoadState('networkidle')`: the chat provider polls every 30s and holds
 * a STOMP socket, so "no requests for 500ms" is not a property this app has.
 * That idiom appeared to work before only because the crash unmounted the
 * provider and stopped the traffic. And tokens are fetched once per role, since
 * the API context is shared and re-authenticating for every helper call spent
 * most of the per-test budget on logins.
 */

const CUSTOMER = { email: 'customer1@bmwtechworks.com', password: 'Customer@123' };
const DEALER = { email: 'dealer1@bmwtechworks.com', password: 'Dealer@123' };
const DEALER2 = { email: 'dealer2@bmwtechworks.com', password: 'Dealer@123' };
const ADMIN = { email: 'admin@bmwtechworks.com', password: 'Admin@123' };

type Creds = { email: string; password: string };

test.use({ viewport: { width: 1600, height: 1000 } });
// Each test signs in two or three roles over the API and then drives two
// browsers, so the default 45s is not enough headroom for a cold service.
test.describe.configure({ timeout: 120_000 });

const tokens = new Map<string, string>();
let firstDealer: string | null = null;

let seq = 0;
/** Unique per run so parallel workers never collide on a conversation title. */
function marker(tag: string): string {
  seq += 1;
  return `${tag}-${Date.now()}-${seq}`;
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function tokenFor(request: APIRequestContext, who: Creds): Promise<string> {
  const cached = tokens.get(who.email);
  if (cached) return cached;
  const res = await request.post('/api/auth/login', { data: who });
  expect(res.ok(), `${who.email} login failed: ${res.status()}`).toBeTruthy();
  const token = (await res.json()).token as string;
  tokens.set(who.email, token);
  return token;
}

async function dealerId(request: APIRequestContext): Promise<string> {
  if (firstDealer) return firstDealer;
  const token = await tokenFor(request, ADMIN);
  const res = await request.get('/dealers', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `GET /dealers failed: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  const list = Array.isArray(body) ? body : body?.content ?? [];
  expect(list.length, 'no dealers seeded').toBeGreaterThan(0);
  firstDealer = String(list[0].dealerId);
  return firstDealer;
}

/**
 * The seeded dealer's three identifiers.
 *
 * <p>`dealerId` addresses the dealer service, `userId` addresses the auth
 * service, and they are different UUIDs for the same person. A conversation
 * carries the *user* id in `participants`, so matching a thread to a dealer
 * needs the user id — reaching for the dealer id there silently matches nothing.
 */
async function dealerIdentity(
  request: APIRequestContext,
  info: TestInfo,
  slot = 0,
): Promise<{ dealerId: string; dealerUserId: string; dealerName: string }> {
  const token = await tokenFor(request, ADMIN);
  const res = await request.get('/dealers', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `GET /dealers failed: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  const list = Array.isArray(body) ? body : body?.content ?? [];
  expect(list.length, 'no dealers seeded').toBeGreaterThan(0);

  /*
   * One dealer per browser project.
   *
   * The suite is `fullyParallel` and runs chromium, firefox and webkit
   * simultaneously, all three signing in as the same seeded customer. Returning
   * `list[0]` unconditionally therefore pointed every parallel run at one shared
   * dealer, and the test that checks a repeated "Chat with this dealership" does
   * not manufacture a second thread could not be evaluated: two runs would each
   * find no existing thread and each create one, and whichever thread a run then
   * re-opened depended on timing rather than on the code.
   *
   * Giving each project its own dealer gives each run its own thread space, so
   * the create/reuse behaviour under test is the only thing that can move it.
   *
   * `slot` separates two tests that run in the same project and both drive a
   * customer-side dealer thread, so they do not share one either.
   */
  const projectOrder = ['chromium', 'firefox', 'webkit'];
  const projectIndex = Math.max(0, projectOrder.indexOf(info.project.name));
  const dealer = list[(projectIndex * 2 + slot) % list.length];

  return {
    dealerId: String(dealer.dealerId),
    dealerUserId: String(dealer.userId),
    dealerName: String(dealer.name),
  };
}

/**
 * The ids of the customer's dealer threads for one dealer.
 *
 * <p>Dealer threads are titled with the dealer's name and carry no test marker,
 * so title-based cleanup cannot find them. Anything a test causes to be created
 * through the UI has to be identified by diffing this list.
 */
async function dealerThreadIds(
  request: APIRequestContext,
  auth: { Authorization: string },
  dealerUserId: string,
): Promise<string[]> {
  const res = await request.get('/api/messages/conversations', { headers: auth });
  expect(res.ok(), `conversation list failed: ${res.status()}`).toBeTruthy();
  const items = ((await res.json())?.items ?? []) as Array<{
    conversationId: string;
    contextType: string;
    contextId: string | null;
    participants: Array<{ userId: string }>;
  }>;
  return items
    .filter(
      (c) =>
        c.contextType === 'GENERAL' &&
        !c.contextId &&
        c.participants.some((p) => p.userId === dealerUserId),
    )
    .map((c) => c.conversationId);
}

/**
 * Creates a conversation through the API as the customer, so the browser tests
 * assert against a thread with a known identity rather than whichever one the
 * shared fixture database happens to contain.
 */
async function createConversation(
  request: APIRequestContext,
  title: string,
): Promise<string> {
  const token = await tokenFor(request, CUSTOMER);
  const res = await request.post('/api/messages/conversations', {
    headers: { Authorization: `Bearer ${token}` },
    data: { contextType: 'GENERAL', dealerId: await dealerId(request), title },
  });
  expect(
    res.status(),
    `create conversation failed: ${res.status()} ${await res.text()}`,
  ).toBe(201);
  return track((await res.json()).conversationId as string);
}

async function login(page: Page, who: Creds) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(who.email);
  await page.locator('input[type="password"]').fill(who.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/(admin|customer|dealer)/, { timeout: 30000 });
  // The sidebar means the authenticated shell is mounted and the role's
  // dashboard is rendering, which is the point at which the app is usable.
  await expect(page.getByRole('navigation').first()).toBeVisible({ timeout: 30000 });
}

async function expectNoLoadError(page: Page) {
  await expect(page.getByTestId('load-error')).toHaveCount(0, { timeout: 20000 });
}

/** The role line under the thread title, e.g. "Admin · Dealer". */
function roleLine(page: Page) {
  return page.getByTestId('thread-roles');
}

async function openConversation(page: Page, title: string) {
  await page.getByRole('button', { name: new RegExp(escape(title)) }).first().click();
  await expect(page.getByPlaceholder('Type a message…')).toBeVisible({ timeout: 30000 });
}

async function send(page: Page, text: string) {
  await page.getByPlaceholder('Type a message…').fill(text);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible({
    timeout: 30000,
  });
}

/**
 * Conversations created by the test currently running, removed afterwards.
 *
 * <p>This file shares one fixture database with the CJS suites and with every
 * other run. It used to create threads and leave them behind, which cost more
 * than the rows: the messaging service resolves every participant of every
 * listed conversation through a per-participant call to the user-role service,
 * and the single customer account is a participant in all of them, so the
 * conversation list got slower with every run until a freshly created thread
 * was not yet in the list when the test went looking for it. That is the most
 * likely reason this file was intermittently flaky under parallel workers.
 *
 * <p>Deletion is ADMIN-only, so the cleanup authenticates as ADMIN rather than
 * reusing whichever role the test happened to use.
 */
const createdByThisTest = new Set<string>();

function track(id: string): string {
  createdByThisTest.add(id);
  return id;
}

test.afterEach(async ({ request }) => {
  if (createdByThisTest.size === 0) return;
  const ids = [...createdByThisTest];
  createdByThisTest.clear();

  const token = await tokenFor(request, ADMIN);
  for (const id of ids) {
    const res = await request.delete(`/api/messages/conversations/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status() !== 204) {
      // Not fatal. A test that already failed should report its own failure
      // rather than a cleanup complaint, but a silent skip would leave the
      // cause of a growing fixture database unrecorded.
      console.warn(`cleanup: could not remove ${id} -> ${res.status()}`);
    }
  }
});

test.describe('Messaging across roles', () => {
  test('the Message button opens a thread instead of crashing the app', async ({
    page,
    request,
  }, info) => {
    await login(page, CUSTOMER);

    // A dealer of its own, distinct from the one the de-duplication test uses.
    // Both tests sign in as the same customer and both press this same button,
    // and the threads they produce are keyed on (customer, dealer) — so sharing
    // a dealer let the two of them race and each seed a duplicate, which is
    // indistinguishable from the de-duplication bug that test exists to catch.
    const own = await dealerIdentity(request, info);
    const auth = { Authorization: `Bearer ${await tokenFor(request, CUSTOMER)}` };
    const before = new Set(await dealerThreadIds(request, auth, own.dealerUserId));

    await page.goto(`/customer/dealers/${own.dealerId}`);
    await page.getByRole('button', { name: 'Chat with this dealership' }).click();

    // This is the reported failure: the click that used to blank the whole app
    // with "Cannot read properties of undefined (reading 'charAt')". The wait is
    // generous because the click also waits on a conversation POST, and a
    // freshly restarted stack can take tens of seconds to serve one.
    await expect(page).toHaveURL(/\/customer\/messages/, { timeout: 60000 });
    await expectNoLoadError(page);

    // Pressing this button can create a thread, and such a thread is titled with
    // the dealer's name, so no title-based sweep would ever recognise it as test
    // data. The click happens once per browser project on every run, which is how
    // the fixture database crept back up to a dozen untitled rows. Diffing the
    // dealer thread list is the only way to attribute a new one to this test.
    //
    // The diff is taken here rather than straight after the click because the
    // click is asynchronous, and the list resolves every participant through the
    // user-role service: a single read straight after the click found nothing and
    // leaked the thread on every run, and a single read a moment later can still
    // race the listing. So it retries briefly, and treats "nothing new" as the
    // thread having been reused, which is the other legitimate outcome.
    let created: string[] = [];
    for (let attempt = 0; attempt < 10 && created.length === 0; attempt++) {
      created = (await dealerThreadIds(request, auth, own.dealerUserId)).filter(
        (id) => !before.has(id),
      );
      if (created.length === 0) await page.waitForTimeout(300);
    }
    for (const id of created) track(id);

    // This is the reported failure: the click that used to blank the whole app
    // with "Cannot read properties of undefined (reading 'charAt')".
    await expect(
      page.getByText('This screen could not be displayed'),
    ).toHaveCount(0);
    await expect(page.getByText('undefined')).toHaveCount(0);

    // The role line is the element that threw. It has to render real roles, and
    // it must not list the viewer, who is already known to themselves.
    await expect(roleLine(page)).toBeVisible({ timeout: 30000 });
    await expect(roleLine(page)).toContainText('Dealer');
    await expect(roleLine(page)).not.toContainText('Customer');

    // And the thread has to be usable, not merely rendered.
    await expect(page.getByPlaceholder('Type a message…')).toBeVisible();
  });

  test('the participant count excludes the signed-in user', async ({ page, request }) => {
    await login(page, CUSTOMER);
    const title = marker('Count Thread');
    const conversationId = await createConversation(request, title);

    // The expected number comes from the API rather than a literal, so the test
    // states a fact about the conversation instead of restating the UI.
    const token = await tokenFor(request, CUSTOMER);
    const me = await request.get('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const myId = (await me.json()).id as string;
    const detail = await request.get(`/api/messages/conversations/${conversationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(detail.ok(), `conversation detail failed: ${detail.status()}`).toBeTruthy();
    const everyone = (await detail.json()).participants as Array<{ userId: string }>;
    const expected = everyone.filter((p) => p.userId !== myId).length;
    expect(
      everyone.length,
      'the fixture needs more than one participant for this to mean anything',
    ).toBeGreaterThan(1);
    expect(expected, 'excluding yourself must actually remove someone').toBeLessThan(
      everyone.length,
    );

    await page.goto('/customer/messages');
    await openConversation(page, title);

    const countLabel = page.getByText(/^\d+ participants?$/).first();
    await expect(countLabel).toBeVisible();
    await expect(countLabel).toHaveText(
      `${expected} participant${expected === 1 ? '' : 's'}`,
    );

    // Your own name must not be offered back to you as the conversation title.
    await expect(page.getByTestId('thread-title')).toHaveText(title);
  });

  test('a customer message reaches the dealer and the reply comes back', async ({
    page,
    browser,
    request,
  }) => {
    const title = marker('Exchange');
    await createConversation(request, title);

    await login(page, CUSTOMER);
    await page.goto('/customer/messages');
    await openConversation(page, title);

    const question = marker('Question');
    await send(page, question);

    // A second browser context, signed in as the dealer, must see it. Using a
    // real second session is the point: stubbing the socket would hide the fact
    // that the message only ever existed in the sender's browser.
    const baseURL = test.info().project.use.baseURL as string;
    const dealerContext = await browser.newContext({
      baseURL,
      viewport: { width: 1600, height: 1000 },
    });
    const dealerPage = await dealerContext.newPage();
    const answer = marker('Answer');
    try {
      await login(dealerPage, DEALER);
      await dealerPage.goto('/dealer/messages');
      await expectNoLoadError(dealerPage);
      await openConversation(dealerPage, title);

      await expect(dealerPage.getByText(question, { exact: false }).first()).toBeVisible({
        timeout: 30000,
      });
      await send(dealerPage, answer);
    } finally {
      await dealerContext.close();
    }

    // Back on the customer's side. A reload stands in for the websocket or the
    // 30s poll, and still proves the reply was persisted rather than echoed.
    await page.reload();
    await openConversation(page, title);
    await expect(page.getByText(question, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(answer, { exact: false }).first()).toBeVisible({
      timeout: 30000,
    });
  });

  test('the admin sees the same thread in the support inbox', async ({ page, request }) => {
    const title = marker('Inbox Thread');
    const conversationId = await createConversation(request, title);

    const token = await tokenFor(request, CUSTOMER);
    const posted = await request.post('/api/messages/send', {
      headers: { Authorization: `Bearer ${token}` },
      data: { conversationId, content: marker('From customer') },
    });
    expect(posted.ok(), `send failed: ${posted.status()}`).toBeTruthy();

    // History is a Spring Page, so the messages are under `content`.
    const history = await request.get(`/api/messages/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(history.ok()).toBeTruthy();
    const said = ((await history.json())?.content ?? []) as Array<{ content: string }>;
    expect(said.length, 'the sent message should be in the history').toBeGreaterThan(0);

    await login(page, ADMIN);
    await page.goto('/admin/inbox');
    await expectNoLoadError(page);
    await openConversation(page, title);

    // The admin is a participant on every conversation, so the inbox is the one
    // surface where a fault on the role line is guaranteed to be seen.
    await expect(page.getByText('This screen could not be displayed')).toHaveCount(0);
    await expect(roleLine(page)).toBeVisible();
    await expect(roleLine(page)).toContainText('Customer');
    await expect(roleLine(page)).not.toContainText('Admin');
    for (const m of said) {
      await expect(page.getByText(m.content, { exact: false }).first()).toBeVisible();
    }
  });

  test('a real non-participant cannot read or post to the thread', async ({ request }) => {
    // dealer2 is a seeded user with no involvement in this conversation, so the
    // 403 is asserted against a genuine outsider rather than a guessed id. The
    // list the caller receives must also never contain a thread they are not in,
    // since the subject line alone would leak.
    const title = marker('Isolated');
    const conversationId = await createConversation(request, title);

    const outsider = await tokenFor(request, DEALER2);
    const mine = await request.get('/api/messages/conversations', {
      headers: { Authorization: `Bearer ${outsider}` },
    });
    expect(mine.ok()).toBeTruthy();
    const listed = ((await mine.json())?.items ?? []) as Array<{ conversationId: string }>;
    expect(
      listed.filter((c) => c.conversationId === conversationId),
      'the conversation list leaked a thread to a non-participant',
    ).toHaveLength(0);

    const peek = await request.get(`/api/messages/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${outsider}` },
    });
    expect(peek.status(), 'a non-participant must not read the thread').toBe(403);

    const post = await request.post('/api/messages/send', {
      headers: { Authorization: `Bearer ${outsider}` },
      data: { conversationId, content: 'should never be stored' },
    });
    expect(post.status(), 'a non-participant must not post to the thread').toBe(403);
  });
});

/**
 * Failure must be stated, and must never be presented as "there is nothing here".
 *
 * These four tests share one theme. Every one of them covers a state the UI can
 * be in that no assertion in the file above could reach, because in each case
 * the screen looks plausible: a thread that failed to load looks like a brand
 * new conversation, a list that is still loading looks like an empty inbox, and
 * a button that navigates to a route that does not exist looks like a button
 * that worked. The defects are the difference between "broken" and "empty", and
 * the difference between "sent you somewhere" and "sent you home", so those are
 * what these assert.
 */
test.describe('Messaging failure states', () => {
  test('the shared messages destination resolves to the role inbox', async ({ page }) => {
    // `ChatStartButton` defaults `redirectTo` to '/messages' (ChatStartButton.tsx).
    // There is no such route, so the '*' catch-all sends the user to '/' and
    // RootRedirect dumps them on their dashboard instead of their inbox — the
    // click appears to work and lands somewhere unrelated. This asserts the
    // default actually arrives, for the role that is signed in.
    await login(page, CUSTOMER);

    await page.goto('/messages');

    await expect(page).toHaveURL(/\/customer\/messages/, { timeout: 30000 });
    // The inbox itself, not a composer: the composer only exists once a thread
    // is selected, and this is about arriving at the right screen at all.
    await expect(page.getByText('Inbox', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Select a conversation to start chatting'),
    ).toBeVisible();
  });

  test('starting a chat with the same dealer twice reuses the thread', async ({
    page,
    request,
  }, info) => {
    // `DealerDetail` starts a chat with `{contextType: 'GENERAL', dealerId}` and
    // no `contextId`. The de-duplication in `startOrOpenConversation` is gated on
    // `request.contextId`, so a dealer-only request never matches an existing
    // thread and every visit to the dealer page manufactures a new one. The
    // fixture database is the evidence: it accumulated seven identical "BMW
    // Chennai" threads before anyone noticed.
    const identity = await dealerIdentity(request, info, 1);
    const auth = { Authorization: `Bearer ${await tokenFor(request, CUSTOMER)}` };

    const threadsWithDealer = () =>
      dealerThreadIds(request, auth, identity.dealerUserId);

    // Before the first click, so any thread this test causes to be created can
    // be identified by id and cleaned up. Dealer threads are titled with the
    // dealer's name, which carries no test marker, so title-based cleanup would
    // never find them and each run would leave another behind.
    const before = new Set(await threadsWithDealer());

    /*
     * What "reuses the thread" actually means, observed from the client.
     *
     * The obvious assertion — that the number of dealer threads is unchanged —
     * cannot be used here. This spec runs in Chromium, Firefox and WebKit at the
     * same time, all three driving the same customer account against the same
     * database, so all three instances of this test run concurrently. Each
     * creates or adopts a thread while the others are asserting, and a count
     * taken from shared state moves underneath the assertion no matter what the
     * code under test does. That is how the previous count-based version started
     * failing in two of three browsers for reasons unrelated to the fix.
     *
     * Two client-side observations are used instead, neither of which is
     * perturbed by a sibling run:
     *   - a second visit issues no conversation-create request, and
     *   - the thread it lands on is one that already existed.
     */
    const creates: string[] = [];
    const historyRequests: string[] = [];
    page.on('request', req => {
      const url = new URL(req.url());
      if (req.method() !== 'POST' && req.method() !== 'GET') return;
      if (url.pathname === '/api/messages/conversations' && req.method() === 'POST') {
        creates.push(req.url());
      }
      const history = url.pathname.match(
        /^\/api\/messages\/conversations\/([^/]+)\/messages$/,
      );
      if (history) historyRequests.push(history[1]);
    });

    /** The conversation whose history the UI last requested. */
    const activeConversation = () => historyRequests.at(-1);

    // First visit establishes whatever the starting state is, so the assertion
    // below is about the *second* visit only and does not depend on whether the
    // fixture already held a thread for this dealer.
    await login(page, CUSTOMER);
    await page.goto(`/customer/dealers/${identity.dealerId}`);
    await page.getByRole('button', { name: 'Chat with this dealership' }).click();
    await expect(page).toHaveURL(/\/customer\/messages/, { timeout: 60000 });
    await expect.poll(() => activeConversation(), { timeout: 30000 }).toBeTruthy();

    const baseline = await threadsWithDealer();
    for (const id of baseline) if (!before.has(id)) track(id);

    creates.length = 0;
    historyRequests.length = 0;

    await page.goto(`/customer/dealers/${identity.dealerId}`);
    await page.getByRole('button', { name: 'Chat with this dealership' }).click();
    await expect(page).toHaveURL(/\/customer\/messages/, { timeout: 60000 });
    await expect.poll(() => activeConversation(), { timeout: 30000 }).toBeTruthy();

    // The second request for the same dealer must open the existing thread
    // rather than create another one.
    expect(
      creates,
      're-opening the same dealer chat must not create a second thread',
    ).toEqual([]);

    // The thread that was opened must be one that already existed. Asserting it
    // equals the id from the first visit would be ambiguous: another browser
    // project may have added a thread for this dealer in between, and the
    // de-duplication is then free to reuse that one instead. With no create
    // request issued, landing on a pre-existing thread is the whole claim.
    const after = await threadsWithDealer();
    expect(
      after,
      're-opening the same dealer chat must land on a pre-existing thread',
    ).toContain(activeConversation());
  });

  test('a failed message history load is stated, not shown as an empty thread', async ({
    page,
    request,
  }) => {
    // A 500 on the history request is currently swallowed. The thread then
    // renders its zero-message state, so a failed read is reported to the user
    // as "Say hello to start the conversation" on a thread that already has
    // messages in it. The seeded message below is what makes that a lie rather
    // than a cosmetic choice.
    const title = marker('Broken History');
    const conversationId = await createConversation(request, title);
    const auth = { Authorization: `Bearer ${await tokenFor(request, CUSTOMER)}` };
    const seeded = marker('Already said this');
    const sent = await request.post('/api/messages/send', {
      headers: auth,
      data: { conversationId, content: seeded },
    });
    expect(sent.ok(), `seeding the thread failed: ${sent.status()}`).toBeTruthy();

    await login(page, CUSTOMER);
    await page.route('**/api/messages/conversations/*/messages*', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'history backend unavailable' }),
      }),
    );

    await page.goto('/customer/messages');
    await openConversation(page, title);

    await expect(page.getByTestId('load-error')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Say hello to start the conversation')).toHaveCount(0);
  });

  test('the conversation list reports loading instead of claiming it is empty', async ({
    page,
  }) => {
    // `isLoadingList` is declared in ChatContext and read by ConversationList,
    // but nothing ever sets it, so the spinner branch is unreachable and the
    // list paints "No conversations yet" on first paint of every one of the
    // three messaging screens. On a slow list request that is a false claim
    // about the user's own data, and it is also the state the first navigation
    // always renders.
    await login(page, CUSTOMER);
    // A regex rather than a glob: the first list request carries no query
    // string, and Playwright's `?` is a single-character wildcard, so the
    // obvious `**/conversations?*` glob silently matches nothing and the test
    // would then "prove" the loading state is missing on a list that had
    // already loaded.
    await page.route(/\/api\/messages\/conversations(\?|$)/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 6000));
      await route.continue();
    });

    await page.goto('/customer/messages');

    // The Inbox header proves the chat panel has mounted, so the "Loading" that
    // follows belongs to the conversation list and not to the route-level
    // Suspense fallback, which renders the same word.
    await expect(page.getByText('Inbox', { exact: true })).toBeVisible();
    await expect(page.getByText('Loading', { exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('No conversations yet')).toHaveCount(0);
  });
});
