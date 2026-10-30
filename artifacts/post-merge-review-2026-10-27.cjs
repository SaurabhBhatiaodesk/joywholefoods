// Review-only reproductions of the actual deployed-source methods. No network.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('assets/cart.js', 'utf8');
async function run() {
  const update = source.slice(source.indexOf('  updateQuantity(line,'), source.indexOf('\n  updateLiveRegions('))
    .replace('  updateQuantity(', 'function updateQuantity(');
  const writes = [];
  const context = {
    fetch: async (url, options) => {
      if (url === '/cart.js') return { ok: true, json: async () => ({ items: [
        // Original subscription line no longer exists. Only a one-time line remains.
        { variant_id: 123, key: '123:one-time', properties: { 'Swap Item': 'No onion' }, selling_plan_allocation: null }
      ] }) };
      writes.push(JSON.parse(options.body));
      return { text: async () => JSON.stringify({ errors: writes.length === 1 ? 'no valid id or line parameter' : 'Stock limit' }) };
    }, document: { getElementById: () => null, querySelectorAll: () => [] },
    window: { location: { pathname: '/cart' }, cartStrings: { error: 'Error' } },
    routes: { cart_change_url: '/cart/change' }, fetchConfig: () => ({ method: 'POST' })
  };
  vm.runInNewContext(update, context);
  const cart = { quantityWrites: new Set(), enableLoading() {}, disableLoading() {}, getSectionsToRender: () => [], updateLiveRegions() {}, querySelectorAll: () => [] };
  await context.updateQuantity.call(cart, '1', '2', 'updates[]', '123', '123:old-subscription', JSON.stringify({ 'Swap Item': 'No onion' }));
  assert.equal(writes.length, 2);
  assert.equal(writes[1].id, '123:one-time');

  const bind = source.slice(source.indexOf('  bindCheckoutCleanup() {'), source.indexOf('\n  triggerSwapNoteSync() {'))
    .replace('  bindCheckoutCleanup()', 'function bindCheckoutCleanup()');
  let listener; const calls = { old: 0, current: 0 };
  const binding = { document: { body: { dataset: {} }, addEventListener(type, fn) { listener = fn; } },
    window: { addEventListener() {}, alert() {} }, clearTimeout() {} };
  vm.runInNewContext(bind, binding);
  const old = { cleanupSwapPropertiesBeforeCheckout: async () => { calls.old++; return false; } };
  const current = { cleanupSwapPropertiesBeforeCheckout: async () => { calls.current++; return false; } };
  binding.bindCheckoutCleanup.call(old);
  binding.bindCheckoutCleanup.call(current); // Represents a replaced drawer element.
  await listener({ target: { closest: () => ({}) }, preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(calls, { old: 1, current: 0 });
  console.log(JSON.stringify({
    missingSellingPlanIdentity: { retryTargets: writes[1].id, scope: 'Simulated stale subscription line; actual retry method' },
    replacedDrawerBinding: calls,
    disclaimer: 'Local method reproductions; not customer recordings or live writes'
  }, null, 2));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
