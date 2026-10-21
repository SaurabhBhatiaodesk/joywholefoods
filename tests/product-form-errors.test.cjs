const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('assets/product-form.js', 'utf8');
const body = source.slice(source.indexOf('.then((response) => {') + '.then((response) => {'.length,
  source.indexOf('\n          })\n          .catch', source.indexOf('.then((response) => {')));

function setup() {
  const messages = [];
  const rendered = [];
  const location = { pathname: '/products/test' };
  const handle = new Function('response', 'window', 'publish', 'PUB_SUB_EVENTS', 'formData', body);
  const form = {
    error: false, submitButton: { querySelector: () => null },
    handleErrorMessage: message => messages.push(message),
    cart: { renderContents: response => rendered.push(response) }, closest: () => null
  };
  return { form, messages, rendered, location,
    run(response) { return handle.call(form, response, { routes: { upsellPage: '/pages/upsells' }, location },
      () => {}, { cartError: 'error', cartUpdate: 'update' }, { get: () => '123' }); }
  };
}

test('Shopify 422 response without a URL displays the error instead of throwing', () => {
  const h = setup();
  h.run({ status: 422, description: 'The product is sold out.' });
  assert.deepEqual(h.messages, ['The product is sold out.']);
  assert.equal(h.form.error, true);
  assert.deepEqual(h.rendered, []);
});

test('successful add without a URL renders the cart normally', () => {
  const h = setup();
  h.run({ id: 123, quantity: 1 });
  assert.equal(h.rendered.length, 1);
  assert.equal(h.form.error, false);
});

test('successful subscription response preserves the existing upsell redirect', () => {
  const h = setup();
  h.run({ url: '/products/test?selling_plan=456' });
  assert.equal(h.rendered.length, 0);
});
