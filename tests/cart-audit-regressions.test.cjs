const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const tick = () => new Promise(setImmediate);

function cartHarness(fetch, note) {
  let CartItems;
  const timers = new Map(); let id = 0;
  const context = {
    HTMLElement: class { constructor() { this.listeners = {}; } addEventListener(n, fn) { this.listeners[n] = fn; } },
    customElements: { define(n, c) { if (n === 'cart-items') CartItems = c; }, get() { return true; } },
    document: { getElementById(n) { return n === 'Cart-note' ? note : null; }, activeElement: { getAttribute() { return 'updates[]'; } } },
    ON_CHANGE_DEBOUNCE_TIMER: 300, fetch,
    routes: { cart_change_url: '/cart/change', cart_update_url: '/cart/update' },
    console: { error() {} }, setTimeout(fn) { timers.set(++id, fn); return id; }, clearTimeout(n) { timers.delete(n); }
  };
  vm.runInNewContext(fs.readFileSync('assets/cart.js', 'utf8'), context);
  return { cart: new CartItems(), timers };
}
const response = (data, ok = true) => ({ ok, json: async () => data });

test('different cart lines keep independent pending changes and snapshot values', async () => {
  const { cart, timers } = cartHarness(); const calls = [];
  cart.updateQuantity = (...args) => calls.push(args);
  const first = { name: 'updates[]', dataset: { index: '1', cartLineKey: 'first' }, value: '2' };
  cart.listeners.change({ target: first });
  cart.listeners.change({ target: { name: 'updates[]', dataset: { index: '2', cartLineKey: 'second' }, value: '3' } });
  first.value = '99';
  for (const fn of [...timers.values()]) fn();
  assert.deepEqual(calls.map(c => [c[0], c[1], c[4]]), [['1', '2', 'first'], ['2', '3', 'second']]);
  cart.listeners.change({ target: { name: 'note', dataset: {}, value: 'instructions' } });
  assert.equal(cart.quantityChanges.size, 0);
});

test('checkout flushes pending quantities and waits for their writes before reading cart', async () => {
  const calls = []; let release;
  const { cart } = cartHarness(async () => { calls.push('read'); return response({ items: [], note: '' }); });
  cart.quantityWrites.add(new Promise(resolve => { release = resolve; }));
  const cleanup = cart.cleanupSwapPropertiesBeforeCheckout();
  await tick(); assert.equal(calls.length, 0);
  cart.quantityWrites.clear(); release();
  assert.equal(await cleanup, true);
});

test('checkout rejects HTTP failures instead of reporting false success', async () => {
  for (const failAt of ['read', 'properties', 'note']) {
    const { cart } = cartHarness(async (url) => {
      if (url === '/cart.js') return response({ items: [{ key: 'box', properties: { '_Swap Item': 'No onion', keep: 'yes' } }], note: '' }, failAt !== 'read');
      return response({}, failAt !== (url.includes('change') ? 'properties' : 'note'));
    });
    assert.equal(await cart.cleanupSwapPropertiesBeforeCheckout(), false, failAt);
  }
});

test('concurrent cleanup callers wait for the same work', async () => {
  let release; let reads = 0;
  const { cart } = cartHarness(url => url === '/cart.js'
    ? (++reads, new Promise(resolve => { release = resolve; }))
    : Promise.resolve(response({})));
  let secondFinished = false;
  const first = cart.cleanupSwapPropertiesBeforeCheckout();
  const second = cart.cleanupSwapPropertiesBeforeCheckout().then(value => { secondFinished = true; return value; });
  await tick(); assert.equal(reads, 1); assert.equal(secondFinished, false);
  release(response({ items: [], note: '' }));
  assert.equal(await first, true); assert.equal(await second, true);
});

test('property cleanup never resends a stale absolute quantity', async () => {
  let quantity = 1; const changes = [];
  const { cart } = cartHarness(async (url, options) => {
    if (url === '/cart.js') {
      quantity = 2;
      return response({ items: [{ key: 'box', quantity: 1, properties: { '_Swap Item': 'No onion', keep: 'yes' } }], note: '' });
    }
    if (url === '/cart/change.js') {
      const body = JSON.parse(options.body); changes.push(body);
      if ('quantity' in body) quantity = body.quantity;
    }
    return response({});
  });
  assert.equal(await cart.cleanupSwapPropertiesBeforeCheckout(), true);
  assert.equal(quantity, 2);
  assert.equal('quantity' in changes[0], false);
  assert.equal(changes[0].properties.keep, 'yes');
});

test('swap note sync uses current customer input instead of stale fetched instructions', async () => {
  const input = { value: 'Old instructions' }; let saved;
  const { cart } = cartHarness(async (url, options) => {
    if (url === '/cart.js') {
      input.value = 'New allergy instructions';
      return response({ items: [{ properties: { '_Swap Item': 'No onion' } }], note: 'Old instructions' });
    }
    saved = JSON.parse(options.body).note; return response({});
  }, input);
  await cart.syncSwapItemsToCartNote();
  assert.equal(saved, 'New allergy instructions\nSwap Item: No onion');
});

test('a sole private swap stays intact instead of sending an invalid empty properties update', async () => {
  const changes = [];
  const { cart } = cartHarness(async (url, options) => {
    if (url === '/cart.js') return response({ items: [{ key: 'box', quantity: 2, properties: { '_Swap Item': 'No onion' } }], note: '' });
    changes.push({ url, body: JSON.parse(options.body) }); return response({});
  });
  assert.equal(await cart.cleanupSwapPropertiesBeforeCheckout(), true);
  assert.equal(changes.length, 1); assert.equal(changes[0].url, '/cart/update.js');
  assert.equal(changes[0].body.note, 'Swap Item: No onion');
});

test('quantity updates address captured line keys and a failed update blocks cleanup', async () => {
  let body;
  const { cart } = cartHarness(async (url, options) => {
    body = JSON.parse(options.body);
    return { text: async () => JSON.stringify({ errors: 'Out of stock' }) };
  });
  cart.enableLoading = () => {}; cart.disableLoading = () => {};
  cart.getSectionsToRender = () => []; cart.updateLiveRegions = () => {};
  const source = fs.readFileSync('assets/cart.js', 'utf8');
  // Same method with a page-specific document/window stub.
  const start = source.indexOf('  updateQuantity(line,');
  const end = source.indexOf('\n  updateLiveRegions(', start);
  const method = source.slice(start, end).replace('  updateQuantity(', 'function updateQuantity(');
  const context = { fetch: async (url, options) => {
    body = JSON.parse(options.body); return { text: async () => JSON.stringify({ errors: 'Out of stock' }) };
  }, document: { getElementById: () => null, querySelectorAll: () => [] },
    window: { location: { pathname: '/cart' } }, routes: { cart_change_url: '/cart/change' }, fetchConfig: () => ({ method: 'POST' }) };
  vm.runInNewContext(method, context);
  await context.updateQuantity.call(cart, '2', '3', 'updates[]', 'variant', 'stable-line-key');
  assert.equal(body.id, 'stable-line-key'); assert.equal('line' in body, false);
  assert.equal(cart.quantityWriteFailed, true);
  await assert.rejects(cart.flushQuantityChanges(), /could not be saved/);
});

function boxHarness(mode, drawer) {
  const source = fs.readFileSync('assets/product-customize-box.js', 'utf8');
  const start = source.indexOf("$('form[action=\"/cart/add\"]').submit(function(e){");
  const end = source.indexOf('\n});', start) + 4;
  let submit, release; const form = { dataset: {} };
  const state = { writes: 0, loading: false, disabled: false, spinner: false, alerts: [], redirects: [] };
  const buttons = { attr(k, v) { state.disabled = v; }, addClass() { state.loading = true; }, removeClass() { state.loading = false; } };
  const spinner = { removeClass() { state.spinner = true; }, addClass() { state.spinner = false; } };
  const context = {
    $(s) {
      if (s === 'form[action="/cart/add"]') return { submit(fn) { submit = fn; } };
      if (s === form) return { find(s) { return s.includes('spinner') ? spinner : buttons; } };
      if (s === '.customize-box__product_card.selected') return { each() {} };
      throw Error('Unexpected selector');
    }, isMaxSelected: () => true, selectedProducts: () => [], frozenSelected: () => [],
    FormData: class { set() {} append() {} }, boxCart: drawer || null,
    document: { activeElement: {} }, console: { error() {} },
    window: { Shopify: { routes: { root: '/' } }, alert: msg => state.alerts.push(msg), location: { pathname: '/products/box', assign: url => state.redirects.push(url) } },
    fetch() { state.writes++; if (mode === 'reject') return Promise.reject(Error('Offline'));
      if (mode === 'pending') return new Promise(resolve => { release = resolve; });
      return Promise.resolve(response(mode === '422' ? { status: 422, description: 'Out of stock' } : { id: 1 }, mode !== '422')); }
  };
  vm.runInNewContext(source.slice(start, end), context);
  return { state, form, submit() { submit({ currentTarget: form, preventDefault() {}, stopPropagation() {} }); }, release() { release(response({ id: 1 })); } };
}
test('custom box network and stock failures release loading and show an error', async () => {
  for (const mode of ['reject', '422']) {
    const h = boxHarness(mode); h.submit(); await tick();
    assert.equal(h.state.loading, false); assert.equal(h.state.disabled, false);
    assert.equal(h.state.spinner, false); assert.equal(h.state.alerts.length, 1);
    assert.equal(h.form.dataset.joyBoxSubmitting, 'false'); assert.equal(h.state.redirects.length, 0);
  }
});
test('custom box ignores repeat submissions while an add is pending', async () => {
  const h = boxHarness('pending'); h.submit(); h.submit(); assert.equal(h.state.writes, 1);
  h.release(); await tick(); assert.equal(h.state.loading, false);
});
test('accepted custom box add without a drawer goes to cart without retrying', async () => {
  const h = boxHarness('success'); h.submit(); await tick();
  assert.equal(h.state.writes, 1); assert.deepEqual(h.state.redirects, ['/cart']); assert.equal(h.state.alerts.length, 0);
});
test('collection reload warning is present only while writes or unsent changes are pending', () => {
  const source = fs.readFileSync('snippets/card-product.liquid', 'utf8');
  const handler = source.match(/window.addEventListener\('beforeunload', function \(event\) \{([\s\S]*?)\n    \}\);/)[1];
  for (const pending of [false, true]) {
    let prevented = false; const event = { preventDefault() { prevented = true; } };
    vm.runInNewContext('(function () {' + handler + '})()', { event, hasPendingCardChanges: () => pending });
    assert.equal(prevented, pending);
    assert.equal('returnValue' in event, pending);
  }
});
