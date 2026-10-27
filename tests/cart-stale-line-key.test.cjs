const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/cart.js', 'utf8');
const method = source.slice(source.indexOf('  updateQuantity(line,'), source.indexOf('\n  updateLiveRegions('))
  .replace('  updateQuantity(', 'function updateQuantity(');

async function run(items, first = { errors: 'no valid id or line parameter' }, originalProperties = { 'Swap Item': 'No onion' }, plan = '0') {
  const writes = []; let reads = 0;
  const context = {
    fetch: async (url, options) => {
      if (url === '/cart.js') { reads++; return { ok: true, json: async () => ({ items }) }; }
      writes.push(JSON.parse(options.body));
      return { text: async () => JSON.stringify(writes.length === 1 ? first : { errors: 'Stock limit' }) };
    },
    document: { getElementById: () => null, querySelectorAll: () => [] },
    window: { location: { pathname: '/cart' }, cartStrings: { error: 'Cart could not be saved' } },
    routes: { cart_change_url: '/cart/change' }, fetchConfig: () => ({ method: 'POST' })
  };
  vm.runInNewContext(method, context);
  const cart = { quantityWrites: new Set(), quantityWriteFailed: false,
    enableLoading() {}, disableLoading() {}, getSectionsToRender: () => [], updateLiveRegions() {}, querySelectorAll: () => [] };
  await context.updateQuantity.call(cart, '1', '2', 'updates[]', '123', '123:old', JSON.stringify(originalProperties), plan);
  return { writes, reads, cart };
}

test('rejected stale key resolves the same swap line after Bird changes its properties', async () => {
  const result = await run([
    { variant_id: 123, key: '123:plain', properties: { _BirdChimeSlotId: 'x' } },
    { variant_id: 123, key: '123:new', properties: { 'Swap Item': 'No onion', _BirdChimeSlotId: 'x' } }
  ]);
  assert.equal(result.reads, 1); assert.equal(result.writes.length, 2);
  assert.equal(result.writes[1].id, '123:new'); assert.equal(result.writes[1].quantity, '2');
});

test('ambiguous matching cart lines never guess which customer line to change', async () => {
  const result = await run([
    { variant_id: 123, key: '123:a', properties: { 'Swap Item': 'No onion' } },
    { variant_id: 123, key: '123:b', properties: { 'Swap Item': 'No onion' } }
  ]);
  assert.equal(result.writes.length, 1); assert.equal(result.cart.quantityWriteFailed, true);
});

test('stock rejections are not retried as stale keys', async () => {
  const result = await run([], { errors: 'Out of stock' });
  assert.equal(result.reads, 0); assert.equal(result.writes.length, 1);
});

test('missing original line is never replaced by a different swap request', async () => {
  const result = await run([{ variant_id: 123, key: '123:other', properties: { 'Swap Item': 'No milk' } }]);
  assert.equal(result.writes.length, 1); assert.equal(result.cart.quantityWriteFailed, true);
});

test('Liquid pair-array properties match Ajax object properties after a key change', async () => {
  const result = await run([{ variant_id: 123, key: '123:new', properties: { 'Swap Item': 'No onion', _BirdChimeSlotId: 'new' } }],
    undefined, [['Swap Item', 'No onion'], ['_BirdChimeSlotId', 'old']]);
  assert.equal(result.writes.length, 2); assert.equal(result.writes[1].id, '123:new');
});

test('a vanished subscription line never retries against a one-time line', async () => {
  const result = await run([{ variant_id: 123, key: '123:one-time', properties: { 'Swap Item': 'No onion' } }], undefined, undefined, '101');
  assert.equal(result.writes.length, 1); assert.equal(result.cart.quantityWriteFailed, true);
});

test('recovery selects the original selling plan among otherwise identical lines', async () => {
  const result = await run([
    { variant_id: 123, key: '123:one-time', properties: { 'Swap Item': 'No onion' } },
    { variant_id: 123, key: '123:other-plan', properties: { 'Swap Item': 'No onion' }, selling_plan_allocation: { selling_plan: { id: 202 } } },
    { variant_id: 123, key: '123:original-plan', properties: { 'Swap Item': 'No onion' }, selling_plan_allocation: { selling_plan: { id: 101 } } }
  ], undefined, undefined, '101');
  assert.equal(result.writes.length, 2); assert.equal(result.writes[1].id, '123:original-plan');
});

test('one-time recovery cannot target a subscription and missing plan identity fails closed', async () => {
  const items = [{ variant_id: 123, key: '123:subscription', properties: { 'Swap Item': 'No onion' }, selling_plan_allocation: { selling_plan: { id: 101 } } }];
  for (const plan of ['0', null, '']) {
    const result = await run(items, undefined, undefined, plan);
    assert.equal(result.writes.length, 1); assert.equal(result.cart.quantityWriteFailed, true);
  }
});
