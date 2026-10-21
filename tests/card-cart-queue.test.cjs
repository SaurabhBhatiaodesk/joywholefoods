const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('snippets/card-product.liquid', 'utf8');
function fn(name) {
  const start = source.indexOf('    function ' + name + '(');
  return source.slice(start, source.indexOf('\n    }', start) + 6);
}

test('rapid changes across cards serialize writes and retain the last requested quantities', async () => {
  let server = { items: [], item_count: 0 };
  let inFlight = 0;
  let maxInFlight = 0;
  let responseDelay = 15;
  const requests = [];
  const snapshot = () => JSON.parse(JSON.stringify(server));
  const controls = [1, 2, 3].map(id => ({ id, displayed: 0, state: {
    desired: 0, confirmed: 0, pending: false, running: false, timer: null, version: 0
  } }));
  const context = {
    number: (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback,
    states: new WeakMap(), cartQueue: Promise.resolve(), queuedCartJobs: 0,
    cartWritesInFlight: 0, cartWriteFailed: false, cartChangeCount: 0,
    latestCart: snapshot(),
    getState: control => control.state, getCurrentVariantId: control => control.id,
    getMax: () => Infinity, render: (control, qty) => { control.displayed = qty; },
    setControlVisibility() {}, setLatestCart(cart) { context.latestCart = cart; return cart; },
    window: { setTimeout, clearTimeout },
    readCart: async () => snapshot(), fetchCart: async () => snapshot(),
    fetch: async (url, options) => {
      const body = JSON.parse(options.body);
      requests.push({ url, body });
      maxInFlight = Math.max(maxInFlight, ++inFlight);
      // Hold the first response while the customer changes several quantities.
      await new Promise(resolve => setTimeout(resolve, responseDelay));
      let response;
      if (url.endsWith('/add.js')) {
        const line = body.items[0];
        const existing = server.items.find(item => item.variant_id === line.id);
        if (existing) existing.quantity += line.quantity;
        else server.items.push({ key: 'line-' + line.id, variant_id: line.id, quantity: line.quantity });
        response = { items: [server.items.find(item => item.variant_id === line.id)] };
      } else {
        const line = server.items.find(item => item.key === body.id);
        line.quantity = body.quantity;
        server.items = server.items.filter(item => item.quantity > 0);
        response = server;
      }
      server.item_count = server.items.reduce((sum, item) => sum + item.quantity, 0);
      inFlight--;
      const result = JSON.parse(JSON.stringify(response));
      return { ok: true, json: async () => result };
    }
  };
  vm.createContext(context);
  vm.runInContext(['findCartItem', 'mergeAddedLines', 'postJson', 'writeQuantity',
    'runQuantityRequest', 'requestQuantity', 'flush', 'queue'].map(fn).join('\n'), context);
  context.queue(controls[0], 1);
  await new Promise(resolve => setTimeout(resolve, 3));
  context.queue(controls[0], 2);
  context.queue(controls[1], 1);
  context.queue(controls[2], 1);
  context.queue(controls[1], 3);
  context.queue(controls[2], 2);
  for (let attempt = 0; attempt < 100 && controls.some(control => control.state.pending || control.state.running); attempt++) {
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  assert.equal(maxInFlight, 1, 'No overlapping cart mutations');
  assert.deepEqual(controls.map(control => control.state.confirmed), [2, 3, 2]);
  assert.deepEqual(controls.map(control => control.displayed), [2, 3, 2]);
  assert.equal(server.item_count, 7);
  assert.equal(requests.filter(request => request.url.endsWith('/add.js')).length, 3);
  assert.equal(context.queuedCartJobs, 0);

  // Match the reported pattern: four distinct adds 150 ms apart, five rounds.
  // The fake Shopify response takes 200 ms, so successive clicks overlap it.
  responseDelay = 200;
  for (let round = 0; round < 5; round++) {
    const batch = Array.from({ length: 4 }, (_, index) => ({
      id: 100 + round * 4 + index, displayed: 0,
      state: { desired: 0, confirmed: 0, pending: false, running: false, timer: null, version: 0 }
    }));
    for (const control of batch) {
      context.queue(control, 1);
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    for (let attempt = 0; attempt < 100 && batch.some(control => control.state.pending || control.state.running); attempt++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    for (const control of batch) {
      assert.equal(server.items.find(item => item.variant_id === control.id)?.quantity, 1);
      assert.equal(control.state.confirmed, 1);
    }
  }
  assert.equal(server.items.filter(item => item.variant_id >= 100).length, 20);
  assert.equal(maxInFlight, 1);
});
