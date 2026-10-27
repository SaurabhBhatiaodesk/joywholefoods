const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(process.env.JOY_QUEUE_TEST_FILE || 'snippets/cart-write-queue.liquid', 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1].replace('{{ shop.permanent_domain | json }}', '"example.myshopify.com"');
test('Ajax adds and Bird Storefront cart mutations share one transport queue', async () => {
  let active = 0, max = 0;
  const order = [], releases = [];
  const context = { URL, Promise, location: { href: 'https://example.com/collections/all', origin: 'https://example.com' },
    window: { setTimeout, fetch: (url, options) => {
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
test('Ajax reads, unrelated GraphQL queries and external requests bypass the queue', async () => {
  const calls = [];
  const context = { URL, Promise, location: { href: 'https://example.com/', origin: 'https://example.com' },
    window: { setTimeout, fetch: (...args) => { calls.push(args); return Promise.resolve({}); } } };
  vm.createContext(context); vm.runInContext(code, context);
  context.window.fetch('/cart.js');
  context.window.fetch('/api/2026-04/graphql.json', { method: 'POST', body: '{"query":"query { products(first: 1) { nodes { id } } }"}' });
  context.window.fetch('https://external.example/cart/add.js', { method: 'POST' });
  assert.equal(calls.length, 3);
});

async function flush() { for (let i = 0; i < 40; i++) await Promise.resolve(); }
function harness(fetch) {
  let now = 0;
  const timers = [];
  class ClockDate extends Date { static now() { return now; } }
  const context = { URL, Promise, Date: ClockDate,
    location: { href: 'https://example.com/', origin: 'https://example.com' },
    window: { fetch, setTimeout(fn, ms) { timers.push({ at: now + ms, fn }); } } };
  vm.createContext(context); vm.runInContext(code, context);
  return {
    send: context.window.fetch,
    now: () => now,
    async tick(ms) {
      await flush();
      const end = now + ms;
      while (true) {
        timers.sort((a, b) => a.at - b.at);
        if (!timers.length || timers[0].at > end) break;
        const timer = timers.shift(); now = timer.at; timer.fn(); await flush();
      }
      now = end; await flush();
    }
  };
}
const api = '/api/2026-04/graphql.json';
const read = { method: 'POST', body: JSON.stringify({ query: 'query { cart(id: "x") { totalQuantity } }' }) };
function write(quantity) {
  return { method: 'POST', body: JSON.stringify({
    query: 'mutation { cartLinesUpdate(cartId: "x", lines: []) { cart { id } } }', quantity
  }) };
}

test('app read -> theme add -> app stale write finishes app write before the add', async () => {
  let quantity = 1;
  const order = [];
  const h = harness((url, options) => {
    const body = JSON.parse(options.body);
    if (url === '/cart/add.js') { order.push('add'); quantity++; }
    else if (body.quantity !== undefined) { order.push('app-write'); quantity = body.quantity; }
    else order.push('read');
    const snapshot = quantity;
    return Promise.resolve({ json: async () => ({ quantity: snapshot }) });
  });
  const stale = await (await h.send(api, read)).json();
  const add = h.send('/cart/add.js', { method: 'POST', body: '{}' });
  await flush();
  const mutation = h.send(api, write(stale.quantity));
  await flush();
  await h.tick(1500);
  await Promise.all([add, mutation]);
  assert.deepEqual(order, ['read', 'app-write', 'add']);
  assert.equal(quantity, 2);
});

test('repeated background cart reads do not starve a pending add', async () => {
  const calls = [];
  const h = harness((url) => { calls.push({ url, at: h.now() }); return Promise.resolve({}); });
  await h.send(api, read);
  const add = h.send('/cart/add.js', { method: 'POST', body: '{}' });
  const pendingReads = [];
  for (let i = 0; i < 4; i++) {
    pendingReads.push(h.send(api, read));
    await h.tick(500);
  }
  await Promise.all([add, ...pendingReads]);
  assert.equal(calls.find(call => call.url === '/cart/add.js').at, 1500);
  assert.equal(calls[1].url, '/cart/add.js');
});

test('unrelated GraphQL polling introduces no artificial delay', async () => {
  const calls = [];
  const h = harness((url) => { calls.push({ url, at: h.now() }); return Promise.resolve({}); });
  await h.send(api, { method: 'POST', body: '{"query":"query { shop { name } }"}' });
  await h.send('/cart/add.js', { method: 'POST', body: '{}' });
  assert.equal(calls[1].at, 0);
});

test('a new app cart read waits for an already pending theme add', async () => {
  let quantity = 1, release;
  const h = harness((url) => {
    if (url === '/cart/add.js') return new Promise(resolve => { release = () => { quantity++; resolve({}); }; });
    return Promise.resolve({ json: async () => ({ quantity }) });
  });
  const add = h.send('/cart/add.js', { method: 'POST', body: '{}' });
  const query = h.send(api, read);
  await flush(); release(); await add;
  assert.equal((await (await query).json()).quantity, 2);
});

test('slow in-flight app write is never bypassed by a timeout', async () => {
  let releaseWrite;
  const calls = [];
  const h = harness((url, options) => {
    calls.push(url);
    if (url === api && /mutation/.test(options.body)) return new Promise(resolve => { releaseWrite = resolve; });
    return Promise.resolve({});
  });
  await h.send(api, read);
  const add = h.send('/cart/add.js', { method: 'POST', body: '{}' });
  const mutation = h.send(api, write(1));
  await h.tick(10000);
  assert.deepEqual(calls, [api, api]);
  releaseWrite({}); await mutation; await h.tick(1500); await add;
  assert.equal(calls[2], '/cart/add.js');
});

test('an app read failure releases the queue without retrying the request', async () => {
  let reads = 0, adds = 0;
  const h = harness((url) => {
    if (url === api) { reads++; return Promise.reject(new Error('offline')); }
    adds++; return Promise.resolve({});
  });
  await assert.rejects(h.send(api, read), /offline/);
  const add = h.send('/cart/add.js', { method: 'POST', body: '{}' });
  await h.tick(1500); await add;
  assert.equal(reads, 1); assert.equal(adds, 1);
});

test('slow cart response body holds the continuation window without consuming the original response', async () => {
  let finishBody;
  const calls = [];
  const response = { clone: () => ({ arrayBuffer: () => new Promise(resolve => { finishBody = resolve; }) }) };
  const h = harness(url => { calls.push(url); return Promise.resolve(url === api ? response : {}); });
  assert.equal(await h.send(api, read), response);
  const add = h.send('/cart/add.js', { method: 'POST', body: '{}' });
  await h.tick(10000);
  assert.deepEqual(calls, [api]);
  finishBody(new ArrayBuffer(0)); await flush(); await h.tick(1500); await add;
  assert.deepEqual(calls, [api, '/cart/add.js']);
});
