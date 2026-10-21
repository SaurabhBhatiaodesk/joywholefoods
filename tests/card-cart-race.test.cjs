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
      context.event = { target: { closest: () => ({ getAttribute: () => '/cart', href: 'https://test.invalid/cart' }) }, preventDefault() {} };
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
