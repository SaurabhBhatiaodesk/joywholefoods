// Offline execution of the actual custom-box submit handler; no Shopify calls.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('assets/product-customize-box.js', 'utf8');
const start = source.indexOf("$('form[action=\"/cart/add\"]').submit(function(e){");
const end = source.indexOf('\n});', start) + 4;
assert.ok(start >= 0 && end > start);
async function run(mode) {
  let handler, writes = 0;
  const state = { loading: false, disabled: false, spinner: false };
  const buttons = { attr(k, v) { state.disabled = v; }, addClass() { state.loading = true; }, removeClass() { state.loading = false; } };
  const spinner = { removeClass() { state.spinner = true; }, addClass() { state.spinner = false; } };
  const context = {
    $(selector) {
      if (selector === 'form[action="/cart/add"]') return { submit(fn) { handler = fn; } };
      if (selector === 'form [type="submit"]') return buttons;
      if (selector === 'form .loading-overlay__spinner') return spinner;
      if (selector === '.customize-box__product_card.selected') return { each() {} };
      throw new Error('Unexpected selector ' + selector);
    },
    isMaxSelected: () => true, selectedProducts: () => [], frozenSelected: () => [],
    document: { querySelector: () => ({}) }, FormData: class { set() {} },
    boxCart: null, window: { Shopify: { routes: { root: '/' } } },
    console: { error() {} },
    fetch() { writes++; return mode === 'reject' ? Promise.reject(new Error('Offline')) : new Promise(() => {}); }
  };
  vm.runInNewContext(source.slice(start, end), context);
  const event = { preventDefault() {}, stopPropagation() {} };
  handler(event);
  if (mode === 'double') handler(event);
  await new Promise(resolve => setImmediate(resolve));
  return { writes, ...state };
}
(async () => {
  const failure = await run('reject');
  assert.deepEqual(failure, { writes: 1, loading: true, disabled: true, spinner: true });
  const duplicate = await run('double');
  assert.equal(duplicate.writes, 2);
  console.log(JSON.stringify({ networkFailure: failure, repeatedSubmit: duplicate, scope: 'subscription-box template only; offline handler tests, not live customer reproduction' }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
