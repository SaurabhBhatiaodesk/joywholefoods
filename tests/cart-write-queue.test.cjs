const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync('snippets/cart-write-queue.liquid', 'utf8')
  .replace(/<\/?script>/g, '').replace('{{ shop.permanent_domain | json }}', '"example.myshopify.com"');
test('Ajax adds and Bird Storefront cart mutations share one transport queue', async () => {
  let active = 0, max = 0;
  const order = [], releases = [];
  const context = { URL, Promise, location: { href: 'https://example.com/collections/all', origin: 'https://example.com' },
    window: { fetch: (url, options) => {
      order.push(url); max = Math.max(max, ++active);
      return new Promise((resolve, reject) => releases.push({ resolve: value => { active--; resolve(value); }, reject: error => { active--; reject(error); } }));
    } } };
  vm.createContext(context); vm.runInContext(code, context);
  const send = context.window.fetch;
  const first = send('/cart/add.js', { method: 'POST', body: '{}' });
  const bird = send('https://example.myshopify.com/api/2026-04/graphql.json', {
    method: 'POST', body: JSON.stringify({ query: 'mutation { cartLinesUpdate(cartId: "x", lines: []) { cart { id } } }' }) });
  const second = send('/cart/change.js', { method: 'POST', body: '{}' });
  await new Promise(setImmediate);
  assert.deepEqual(order, ['/cart/add.js']);
  const response = { status: 200 };
  releases[0].resolve(response); assert.equal(await first, response);
  await new Promise(setImmediate); assert.equal(order.length, 2);
  const failure = new Error('offline');
  releases[1].reject(failure); await assert.rejects(bird, /offline/);
  await new Promise(setImmediate); assert.equal(order.length, 3);
  releases[2].resolve(response); await second;
  assert.equal(max, 1);
});
test('cart reads, GraphQL queries and external requests bypass the write queue', async () => {
  const calls = [];
  const context = { URL, Promise, location: { href: 'https://example.com/', origin: 'https://example.com' },
    window: { fetch: (...args) => { calls.push(args); return Promise.resolve({}); } } };
  vm.createContext(context); vm.runInContext(code, context);
  context.window.fetch('/cart.js');
  context.window.fetch('/api/2026-04/graphql.json', { method: 'POST', body: '{"query":"query { cart(id: \"x\") { id } }"}' });
  context.window.fetch('https://external.example/cart/add.js', { method: 'POST' });
  assert.equal(calls.length, 3);
});
