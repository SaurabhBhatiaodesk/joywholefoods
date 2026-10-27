// Runs actual cart methods with mock DOM/network; never contacts Shopify.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('assets/cart.js', 'utf8');
function setup(fetch) {
  let CartItems;
  const timers = new Map(); let nextTimer = 0;
  const context = {
    HTMLElement: class { constructor() { this.listeners = {}; } addEventListener(type, fn) { this.listeners[type] = fn; } },
    customElements: { define(name, ctor) { if (name === 'cart-items') CartItems = ctor; }, get() { return true; } },
    document: { getElementById() { return null; }, activeElement: { getAttribute() { return 'updates[]'; } } },
    debounce: null, ON_CHANGE_DEBOUNCE_TIMER: 300, fetch,
    routes: { cart_change_url: '/cart/change', cart_update_url: '/cart/update' },
    console: { error() {} },
    setTimeout(fn) { const id = ++nextTimer; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  vm.createContext(context);
  const globalSource = fs.readFileSync('assets/global.js', 'utf8');
  vm.runInContext(globalSource.slice(globalSource.indexOf('function debounce('), globalSource.indexOf('\nfunction throttle(')), context);
  vm.runInContext(source, context);
  return { cart: new CartItems(), flushTimers() { const jobs = [...timers.values()]; timers.clear(); jobs.forEach(fn => fn()); } };
}
async function run() {
  const results = [];
  // A: all cart line changes use one debounce timer, so changing another line drops the first.
  const a = setup(() => { throw new Error('Not used'); });
  const writes = [];
  a.cart.updateQuantity = (line, qty) => writes.push({ line, qty });
  a.cart.listeners.change({ target: { dataset: { index: '1' }, value: '2' } });
  a.cart.listeners.change({ target: { dataset: { index: '2' }, value: '3' } });
  a.flushTimers();
  assert.deepEqual(writes, [{ line: '2', qty: '3' }]);
  results.push({ issue: 'Cart line changes within debounce window discard earlier different-line change', requested: 2, dispatched: writes });

  // B: fetch fulfills for HTTP 422/500. Cleanup does not check response.ok.
  const b = setup(async url => url === '/cart.js'
    ? { ok: true, json: async () => ({ items: [{ key: 'box', quantity: 1, properties: { '_Swap Item': 'No onions' } }], note: '' }) }
    : { ok: false, status: 422, json: async () => ({ description: 'Unable to update cart' }) });
  assert.equal(await b.cart.cleanupSwapPropertiesBeforeCheckout(), true);
  results.push({ issue: 'Checkout cleanup reports success even when change/update returns HTTP 422', result: true });

  // C: cleanup reads old quantity then sends it as an absolute write after user increments.
  let quantity = 1;
  const c = setup(async (url, options) => {
    if (url === '/cart.js') {
      const snapshot = { items: [{ key: 'box', quantity: 1, properties: { '_Swap Item': 'No onions' } }], note: '' };
      quantity = 2; // Simulate a separately queued user increment after snapshot creation.
      return { ok: true, json: async () => snapshot };
    }
    if (url === '/cart/change.js') quantity = JSON.parse(options.body).quantity;
    return { ok: true };
  });
  await c.cart.cleanupSwapPropertiesBeforeCheckout();
  assert.equal(quantity, 1);
  results.push({ issue: 'Checkout swap cleanup can overwrite a newer quantity with its read snapshot', expected: 2, actual: quantity, scope: 'Simulated interleaving; not a customer recording' });

  // D: a second cleanup call claims success while the first has not even read cart yet.
  let releaseRead;
  const d = setup(url => url === '/cart.js'
    ? new Promise(resolve => { releaseRead = resolve; })
    : Promise.resolve({ ok: true }));
  let firstFinished = false;
  const first = d.cart.cleanupSwapPropertiesBeforeCheckout().then(() => { firstFinished = true; });
  const secondResult = await d.cart.cleanupSwapPropertiesBeforeCheckout();
  assert.equal(secondResult, true);
  assert.equal(firstFinished, false);
  results.push({ issue: 'Second checkout cleanup returns success while first cleanup is unfinished', secondResult, firstFinished });
  releaseRead({ json: async () => ({ items: [], note: '' }) }); await first;

  // E: automatic swap-note sync snapshots an old note, then overwrites a newer saved note.
  let note = 'Old instructions';
  const e = setup(async (url, options) => {
    if (url === '/cart.js') {
      const snapshot = { items: [{ properties: { '_Swap Item': 'No onions' } }], note };
      note = 'New allergy instructions'; // User saves after the snapshot was made.
      return { json: async () => snapshot };
    }
    note = JSON.parse(options.body).note;
    return { ok: true };
  });
  await e.cart.syncSwapItemsToCartNote();
  assert.equal(note, 'Old instructions\nSwap Item: No onions');
  results.push({ issue: 'Automatic swap-note sync can overwrite more recent customer instructions', expectedNote: 'New allergy instructions', actualNote: note, scope: 'Simulated interleaving; no real customer data' });
  console.log(JSON.stringify(results, null, 2));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
