const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/cart.js', 'utf8');
const method = source.slice(source.indexOf('  bindCheckoutCleanup() {'), source.indexOf('\n  triggerSwapNoteSync() {'))
  .replace('  bindCheckoutCleanup()', 'function bindCheckoutCleanup()');
const tick = () => new Promise(setImmediate);

function harness() {
  let controllers = [], listener, submissions = 0, closest;
  const alerts = [], counts = new Map();
  const submit = { value: 'checkout' };
  const form = { querySelector: () => submit, requestSubmit() { submissions++; } };
  const trigger = { form, getAttribute: () => null, closest: selector => selector.includes('cart-items') ? closest : form };
  const context = {
    document: { body: { dataset: {} }, addEventListener(n, fn) { listener = fn; },
      querySelectorAll: selector => selector === 'cart-items, cart-drawer-items' ? controllers : [] },
    window: { addEventListener() {}, alert: text => alerts.push(text) },
    console: { error() {} }, clearTimeout() {}, setTimeout() { return 1; }
  };
  vm.runInNewContext(method, context);
  return {
    alerts, counts, get submissions() { return submissions; },
    component(tagName = 'CART-DRAWER-ITEMS') {
      const count = { flush: 0, cleanup: 0 }; const component = {
        tagName, isConnected: true,
        async flushQuantityChanges() { count.flush++; },
        async cleanupSwapPropertiesBeforeCheckout() { count.cleanup++; return true; }
      };
      counts.set(component, count); return component;
    },
    bind(component) { context.bindCheckoutCleanup.call(component); },
    replace(next) { controllers = next; },
    scope(component) { closest = component; },
    click() { return listener({ target: { closest: () => trigger }, preventDefault() {}, stopPropagation() {} }); }
  };
}

test('checkout resolves a replacement drawer instead of its disconnected original', async () => {
  const h = harness(); const old = h.component(); h.replace([old]); h.bind(old);
  old.isConnected = false; old.checkoutSubmitting = true;
  const current = h.component(); h.replace([current]); h.bind(current);
  await h.click();
  assert.deepEqual(h.counts.get(old), { flush: 0, cleanup: 0 });
  assert.deepEqual(h.counts.get(current), { flush: 1, cleanup: 1 });
  assert.equal(h.submissions, 1);
});

test('checkout waits for pending edits on both connected page and drawer', async () => {
  const h = harness(); const page = h.component('CART-ITEMS'), drawer = h.component();
  let release; drawer.flushQuantityChanges = () => new Promise(resolve => { release = resolve; });
  h.replace([page, drawer]); h.bind(page);
  const checkout = h.click(); await tick();
  assert.equal(h.submissions, 0); assert.equal(h.counts.get(page).cleanup, 0);
  release(); await checkout;
  assert.equal(h.submissions, 1); assert.equal(h.counts.get(page).cleanup, 1);
});

test('repeated checkout taps share the current preparation guard', async () => {
  const h = harness(); const current = h.component(); let release;
  current.flushQuantityChanges = () => new Promise(resolve => { release = resolve; });
  h.replace([current]); h.bind(current);
  const first = h.click(); await h.click(); assert.equal(h.submissions, 0);
  release(); await first;
  assert.equal(h.counts.get(current).cleanup, 1); assert.equal(h.submissions, 1);
});

test('failed current edits block checkout and allow a later corrected retry', async () => {
  const h = harness(); const current = h.component();
  current.flushQuantityChanges = async () => { throw Error('Offline'); };
  h.replace([current]); h.bind(current); await h.click();
  assert.equal(h.alerts.length, 1); assert.equal(h.submissions, 0);
  current.flushQuantityChanges = async () => {};
  await h.click(); assert.equal(h.submissions, 1);
});
