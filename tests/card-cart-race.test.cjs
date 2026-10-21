const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('snippets/card-product.liquid', 'utf8');
const externalCode = source.slice(source.indexOf('    function acceptExternalCart('), source.indexOf("    document.addEventListener('cart:updated'", source.indexOf('    function acceptExternalCart(')));
const navigationCode = source.match(/document.addEventListener\('click', function \(event\) \{([\s\S]*?)\n    \}, true\);/)[1];

function harness() {
  const timers = [];
  const alerts = [];
  const painted = [];
  let reads = 0;
  const context = {
    queuedCartJobs: 0, cartWritesInFlight: 0, cartWriteFailed: false,
    pendingControl: false,
    externalRefreshTimer: null, externalRefreshRunning: false, externalRefreshRequested: false,
    console: { warn() {} },
    fetchCart: async () => { reads++; return { item_count: 3 }; },
    syncAllControls: cart => painted.push(cart.item_count),
    window: {
      location: { href: '' },
      setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length; },
      alert: message => alerts.push(message)
    }
  };
  context.hasPendingCardChanges = () => context.queuedCartJobs > 0 || context.cartWritesInFlight > 0 || context.pendingControl;
  vm.createContext(context);
  vm.runInContext(externalCode, context);
  return {
    context, alerts, painted,
    get reads() { return reads; },
    async tick() {
      const timer = timers.shift();
      if (timer) timer.fn();
      // Drain the promise chain used by fetch/then/catch/finally.
      await new Promise(resolve => setImmediate(resolve));
      return timer;
    },
    get timerCount() { return timers.length; },
    clickCart() {
      context.event = { target: { closest: () => ({ getAttribute: () => '/cart', href: 'https://test.invalid/cart' }) }, preventDefault() {}, stopImmediatePropagation() {}, stopPropagation() {} };
      vm.runInContext('(function(event){' + navigationCode + '})(event)', context);
    }
  };
}

test('old external snapshot is never painted, even long after a completed write', async () => {
  const h = harness();
  h.context.acceptExternalCart({ item_count: 0 });
  await h.tick();
  assert.deepEqual(h.painted, [3]);
  assert.equal(h.reads, 1);
});

test('external event bursts are coalesced and reads wait for queued writes', async () => {
  const h = harness();
  h.context.queuedCartJobs = 1;
  for (let i = 0; i < 20; i++) h.context.acceptExternalCart({ item_count: 0 });
  await h.tick();
  assert.equal(h.reads, 0);
  assert.equal(h.timerCount, 1);
  h.context.queuedCartJobs = 0;
  await h.tick();
  assert.equal(h.reads, 1);
  assert.equal(h.timerCount, 0);
});

test('failed refresh does not paint stale contents or start an idle polling loop', async () => {
  const h = harness();
  h.context.fetchCart = async () => { throw new Error('offline'); };
  h.context.acceptExternalCart({ item_count: 0 });
  await h.tick();
  assert.deepEqual(h.painted, []);
  assert.equal(h.timerCount, 0);
});

test('navigation never abandons writes that take longer than 15 seconds', async () => {
  const h = harness();
  h.context.queuedCartJobs = 1;
  h.clickCart();
  while (h.timerCount) await h.tick();
  assert.equal(h.context.window.location.href, '');
  assert.equal(h.alerts.length, 1);
});

test('navigation proceeds once queued writes have settled successfully', async () => {
  const h = harness();
  h.context.queuedCartJobs = 1;
  h.clickCart();
  await h.tick();
  h.context.queuedCartJobs = 0;
  while (h.timerCount) await h.tick();
  assert.equal(h.context.window.location.href, 'https://test.invalid/cart');
  assert.equal(h.alerts.length, 0);
});

test('immediate navigation waits for a pending control before its request is queued', async () => {
  const h = harness();
  h.context.pendingControl = true;
  h.clickCart();
  await h.tick();
  assert.equal(h.context.window.location.href, '');
  h.context.pendingControl = false;
  while (h.timerCount) await h.tick();
  assert.equal(h.context.window.location.href, 'https://test.invalid/cart');
});

test('production pending guard detects unsent control changes', () => {
  const body = source.match(/function hasPendingCardChanges\(\) \{([\s\S]*?)\n    \}/)[1];
  const control = {};
  const states = new WeakMap([[control, { pending: true, running: false }]]);
  const guard = new Function('queuedCartJobs', 'cartWritesInFlight', 'document', 'CONTROL_SELECTOR', 'states', body);
  const document = { querySelectorAll: () => [control] };
  assert.equal(guard(0, 0, document, 'control', states), true);
  states.get(control).pending = false;
  assert.equal(guard(0, 0, document, 'control', states), false);
});

test('failed queued write blocks automatic navigation and reports the failure', async () => {
  const h = harness();
  h.context.queuedCartJobs = 1;
  h.clickCart();
  h.context.queuedCartJobs = 0;
  h.context.cartWriteFailed = true;
  while (h.timerCount) await h.tick();
  assert.equal(h.context.window.location.href, '');
  assert.match(h.alerts[0], /could not be saved/);
});

function productionFunction(name) {
  const start = source.indexOf('    function ' + name + '(');
  const end = source.indexOf('\n    }', start) + 6;
  return source.slice(start, end);
}

test('late initial cart read preserves a quantity clicked while loading', async () => {
  let completeRead;
  const state = { pending: true, running: false, desired: 2 };
  const control = {};
  const context = {
    fetchCart: () => new Promise(resolve => { completeRead = resolve; }),
    document: { querySelectorAll: () => [control] }, CONTROL_SELECTOR: 'control',
    getState: () => state, getCurrentVariantId: () => 1,
    render: () => { throw new Error('Pending quantity must not be repainted'); },
    console
  };
  vm.createContext(context);
  vm.runInContext(productionFunction('syncControlFromCart') + productionFunction('syncAllControls') + productionFunction('initialize'), context);
  context.initialize();
  completeRead({ items: [] });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.pending, true);
  assert.equal(state.desired, 2);
});

function writeHarness({ status, existing = false } = {}) {
  let writes = 0;
  let reads = 0;
  const oldCart = { items: existing ? [{ variant_id: 1, key: 'old', quantity: 1 }] : [] };
  const context = {
    latestCart: oldCart, cartWritesInFlight: 0, cartChangeCount: 0,
    findCartItem: (cart, id) => cart.items.find(item => item.variant_id === id),
    readCart: async () => { reads++; return { items: [{ variant_id: 1, key: 'new', quantity: 1 }] }; },
    writeQuantity: async cart => {
      writes++;
      if (writes === 1) { const error = new Error('Request failed'); error.status = status; throw error; }
      return cart;
    },
    setLatestCart: cart => cart
  };
  vm.createContext(context);
  vm.runInContext(productionFunction('runQuantityRequest'), context);
  return { context, get writes() { return writes; }, get reads() { return reads; } };
}

test('uncertain network response never repeats a possibly accepted add', async () => {
  const h = writeHarness();
  await assert.rejects(h.context.runQuantityRequest(1, 2), /Request failed/);
  assert.equal(h.writes, 1);
  assert.equal(h.reads, 0);
  assert.equal(h.context.cartWritesInFlight, 0);
});

test('rejected stock request does not blindly retry an add', async () => {
  const h = writeHarness({ status: 422 });
  await assert.rejects(h.context.runQuantityRequest(1, 2));
  assert.equal(h.writes, 1);
});

test('removed saved-cart line key is refreshed before one retry', async () => {
  const h = writeHarness({ status: 400, existing: true });
  const result = await h.context.runQuantityRequest(1, 2);
  assert.equal(h.writes, 2);
  assert.equal(h.reads, 1);
  assert.equal(result.items[0].key, 'new');
});

for (const file of ['main-collection-product-grid-filter', 'main-collection-product-grid', 'main-search']) {
  test(file + ': legacy sync cannot hide or reset isolated quantity controls', () => {
    const section = fs.readFileSync('sections/' + file + '.liquid', 'utf8');
    const body = section.match(/const syncCardFromCart = function \(card\) \{([\s\S]*?)\n    \};/)[1];
    const sync = new Function('card', body);
    assert.doesNotThrow(() => sync({ root: { querySelector: () => ({}) } }));
  });
}
