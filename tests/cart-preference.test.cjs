const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const section = fs.readFileSync('sections/main-cart-footer.liquid', 'utf8');
const scriptBlock = (section.match(/<script>[\s\S]*?<\/script>/g) || [])
  .find((block) => block.includes('updateCartPreference'));
const script = scriptBlock
  .slice(scriptBlock.indexOf('document.addEventListener("DOMContentLoaded", function () {'))
  .replace(/<\/script>$/, '');

function harness() {
  let onReady;
  const requests = [];
  const timers = new Map();
  const alerts = [];
  let timerId = 0;
  const boxPreference = {
    value: 'Styrofoam',
    addEventListener(name, callback) {
      this[name] = callback;
    }
  };
  const checkoutButton = {
    disabled: false,
    loading: false,
    addEventListener(name, callback) {
      this[name] = callback;
    },
    setAttribute(name, value) {
      if (name === 'disabled') this.disabled = value;
    },
    removeAttribute(name) {
      if (name === 'disabled') this.disabled = false;
    },
    classList: {
      add(name) {
        if (name === 'loading') checkoutButton.loading = true;
      },
      remove(name) {
        if (name === 'loading') checkoutButton.loading = false;
      }
    }
  };
  const context = {
    document: {
      addEventListener(name, callback) {
        if (name === 'DOMContentLoaded') onReady = callback;
      },
      getElementById(id) {
        if (id === 'BoxPreference') return boxPreference;
        if (id === 'checkout') return checkoutButton;
        return null;
      }
    },
    window: {
      location: {},
      alert(message) {
        alerts.push(message);
      }
    },
    fetch(url, options) {
      return new Promise((resolve, reject) => requests.push({ url, options, resolve, reject }));
    },
    setTimeout(callback) {
      const id = ++timerId;
      timers.set(id, callback);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    console: { error() {} },
    Promise,
    JSON
  };

  vm.createContext(context);
  vm.runInContext(script, context);

  return {
    alerts,
    boxPreference,
    checkoutButton,
    requests,
    window: context.window,
    start: () => onReady(),
    async tick() {
      await new Promise(setImmediate);
    }
  };
}

test('checkout waits for the pending preference save and persists the latest selection', async () => {
  const h = harness();
  h.start();
  await h.tick();
  assert.equal(h.requests.length, 1);

  h.boxPreference.value = 'Cardboard';
  h.boxPreference.change();
  const checkout = h.checkoutButton.click({ preventDefault() {} });
  await h.tick();

  assert.equal(h.requests.length, 1);
  assert.equal(h.window.location.href, undefined);

  h.requests[0].resolve({ ok: true });
  await h.tick();
  await h.tick();
  assert.equal(h.requests.length, 2);
  assert.equal(JSON.parse(h.requests[1].options.body).attributes['Box Preference'], 'Cardboard');

  h.requests[1].resolve({ ok: true });
  await checkout;
  assert.equal(h.window.location.href, '/checkout');
});

test('checkout stays on the cart and enables retry when preference save fails', async () => {
  const h = harness();
  h.start();
  await h.tick();
  h.requests[0].resolve({ ok: true });
  await h.tick();

  const checkout = h.checkoutButton.click({ preventDefault() {} });
  await h.tick();
  h.requests[1].resolve({ ok: false, status: 422 });
  await checkout;

  assert.equal(h.checkoutButton.disabled, false);
  assert.equal(h.checkoutButton.loading, false);
  assert.equal(h.alerts.length, 1);
  assert.equal(h.window.location.href, undefined);
});

test('cart drawer overlay remains available as a transparent click target', () => {
  const css = fs.readFileSync('assets/custom.css', 'utf8');
  assert.doesNotMatch(css, /\.cart-drawer__overlay\s*\{\s*display:\s*none\s*!important;/);
});

test('theme settings schema remains valid JSON', () => {
  const schema = fs.readFileSync('config/settings_schema.json', 'utf8');
  assert.doesNotThrow(() => JSON.parse(schema));
});
