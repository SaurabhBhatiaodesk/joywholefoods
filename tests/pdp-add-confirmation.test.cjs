const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Run the actual snippet script with a main and sticky PDP buy-button wrapper.
const script = fs.readFileSync('snippets/buy-buttons.liquid', 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1];

function element() {
  return {
    dataset: {}, listeners: {}, value: '', textContent: '', hidden: true,
    classList: { add() {}, remove() {} },
    setAttribute() {}, removeAttribute() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); },
    dispatchEvent(event) { (this.listeners[event.type] || []).forEach(fn => fn(event)); }
  };
}

function setup({ swap = false, addError = false, networkError = false, refreshError = false } = {}) {
  const scope = element();
  const quantity = Object.assign(element(), { value: '1' });
  scope.querySelector = selector => selector.includes('quantity') ? quantity : null;
  const wrappers = [0, 1].map(() => {
    const label = element();
    const button = element();
    const spinner = element();
    const variant = Object.assign(element(), { value: '11' });
    const form = element();
    const wrapper = element();
    wrapper.dataset = { sectionId: 'pdp', productId: '42', swapEnabled: String(swap) };
    wrapper.closest = () => scope;
    button.dataset = { addLabel: 'Add to cart', addedLabel: 'Added to cart' };
    button.querySelector = selector => selector === '.btn-text' ? label : spinner;
    form.querySelector = selector => selector === '.product-variant-id' ? variant : null;
    wrapper.querySelector = selector => ({
      '.custom-direct-cart-form': form, '.direct-add-to-cart-btn': button
    })[selector] || null;
    return { wrapper, button, label };
  });
  const document = element();
  document.readyState = 'complete';
  document.documentElement = element();
  document.querySelector = selector => selector === '#MainProduct-pdp' ? scope : null;
  document.querySelectorAll = selector => selector === '.custom-buy-buttons-wrapper'
    ? wrappers.map(item => item.wrapper) : [];
  let adds = 0;
  vm.runInNewContext(script, {
    document, FormData, setTimeout() {}, console: { error() {}, warn() {} },
    CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
    window: { JoyBoxSwapPopup: { async open() {} } },
    async fetch(url) {
      if (url === '/cart/add.js') {
        adds++;
        if (networkError) throw new Error('Offline');
        return { ok: !addError, async json() {
          return addError ? { status: 422, description: 'Not available' } : { id: 11 };
        } };
      }
      if (refreshError) throw new Error('Cart refresh unavailable');
      return { async json() { return url === '/cart.js' ? { item_count: adds } : {}; } };
    }
  });
  return {
    wrappers, quantity,
    click(index = 0) {
      return wrappers[index].button.listeners.click[0]({ preventDefault() {}, stopPropagation() {} });
    },
    get adds() { return adds; }
  };
}

test('successful main or sticky add confirms both buttons after finally and permits another add', async () => {
  const page = setup();
  await page.click();
  for (const item of page.wrappers) {
    assert.equal(item.label.textContent, 'Added to cart');
    assert.equal(item.button.disabled, false);
  }
  await page.click(1);
  assert.equal(page.adds, 2);
  assert.ok(page.wrappers.every(item => item.label.textContent === 'Added to cart'));
});

test('quantity change resets both confirmation labels', async () => {
  const page = setup();
  await page.click();
  page.quantity.value = '2';
  page.quantity.dispatchEvent({ type: 'change' });
  assert.ok(page.wrappers.every(item => item.label.textContent === 'Add to cart'));
});

for (const failure of ['addError', 'networkError']) {
  test(`${failure} never displays a successful add`, async () => {
    const page = setup({ [failure]: true });
    await page.click();
    assert.ok(page.wrappers.every(item => item.label.textContent === 'Add to cart'));
    assert.equal(page.wrappers[0].button.disabled, false);
  });
}

test('successful add remains confirmed if the following cart refresh fails', async () => {
  const page = setup({ refreshError: true });
  await page.click();
  assert.ok(page.wrappers.every(item => item.label.textContent === 'Added to cart'));
});

test('swap flow retains its existing independent Added label', async () => {
  const page = setup({ swap: true });
  await page.click();
  assert.equal(page.adds, 0);
  assert.equal(page.wrappers[0].label.textContent, 'Added');
  assert.equal(page.wrappers[1].label.textContent, 'Add to cart');
});
