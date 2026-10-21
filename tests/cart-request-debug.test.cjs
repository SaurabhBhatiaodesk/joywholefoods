const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const code = fs.readFileSync('snippets/cart-request-debug.liquid', 'utf8')
  .replace(/<\/?script>/g, '').replace('{{ shop.permanent_domain | json }}', '"example.myshopify.com"');
function setup(search) {
  const logs = [];
  const calls = [];
  const response = { status: 200 };
  const fetch = function (...args) { calls.push(args); return Promise.resolve(response); };
  class XHR {
    open(...args) { this.openArgs = args; }
    send(...args) { this.sendArgs = args; }
    addEventListener(type, fn) { this.onEnd = fn; }
  }
  const originalOpen = XHR.prototype.open;
  const context = { URL, URLSearchParams, WeakMap, Error,
    location: { search, href: 'https://example.com/collections/herbs' + search, origin: 'https://example.com' },
    window: { fetch }, XMLHttpRequest: XHR, console: { info: (...args) => logs.push(args) } };
  vm.createContext(context);
  vm.runInContext(code, context);
  return { context, logs, calls, response, fetch, XHR, originalOpen };
}
test('normal customer pages leave fetch and XHR untouched', () => {
  const c = setup('');
  assert.equal(c.context.window.fetch, c.fetch);
  assert.equal(c.XHR.prototype.open, c.originalOpen);
  assert.deepEqual(c.logs, []);
});
test('diagnostics preserve requests and responses without recording bodies or tokens', async () => {
  const c = setup('?joy_cart_debug=1');
  const options = { method: 'POST', body: 'private-customer-note' };
  const result = await c.context.window.fetch('/cart/add.js?token=private-token', options);
  assert.equal(result, c.response);
  assert.equal(c.calls[0][1], options);
  assert.equal(c.logs.length, 2);
  assert.doesNotMatch(JSON.stringify(c.logs), /private-token|private-customer-note/);
  await c.context.window.fetch('https://external.example/cart.js');
  assert.equal(c.logs.length, 2);
  const xhr = new c.XHR();
  xhr.open('POST', '/cart/update.js?token=private-token', true);
  xhr.send('private-customer-note');
  xhr.status = 200;
  xhr.onEnd();
  assert.equal(xhr.sendArgs[0], 'private-customer-note');
  assert.equal(c.logs.length, 4);
  assert.doesNotMatch(JSON.stringify(c.logs), /private-token|private-customer-note/);
});

test('Storefront diagnostics record operation names without GraphQL variables', async () => {
  const c = setup('?joy_cart_debug=1');
  const body = JSON.stringify({ query: 'mutation Save($id: ID!) { cartLinesUpdate(cartId: $id) { cart { id } } }',
    variables: { id: 'private-cart-token' } });
  await c.context.window.fetch('https://example.myshopify.com/api/2026-04/graphql.json', { method: 'POST', body });
  assert.equal(c.logs.length, 2);
  assert.match(JSON.stringify(c.logs), /cartLinesUpdate/);
  assert.doesNotMatch(JSON.stringify(c.logs), /private-cart-token/);
});
