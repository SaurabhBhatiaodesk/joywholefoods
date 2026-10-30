// Offline diagnostic: executes the current theme queue with a deterministic clock.
// No store/network requests and no production files changed.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = require('node:child_process').execFileSync('git',
  ['show', 'cf98ad12d2d256079b36519c2bb21f64b8851c22:snippets/cart-write-queue.liquid'], { encoding: 'utf8' })
  .replace(/<\/?script>/g, '')
  .replace('{{ shop.permanent_domain | json }}', '"example.myshopify.com"');
let now = 0, quantity = 1;
const timers = [], events = [];
class ClockDate extends Date { static now() { return now; } }
const context = {
  URL, Promise, Date: ClockDate,
  location: { href: 'https://example.com/collections/all', origin: 'https://example.com' },
  window: {
    setTimeout(fn, ms) { timers.push({ at: now + ms, fn }); },
    fetch(url, options) {
      const body = options?.body ? JSON.parse(options.body) : {};
      const kind = String(url).includes('/cart/add') ? 'theme:add-one' :
        /mutation/.test(body.query || '') ? 'app:write-old-quantity' : 'app:read';
      events.push({ at: now, kind });
      if (kind === 'theme:add-one') quantity++;
      if (kind === 'app:write-old-quantity') quantity = body.variables.quantity;
      return Promise.resolve({ ok: true, json: async () => ({ quantity }) });
    }
  }
};
vm.createContext(context);
vm.runInContext(source, context);
async function flush() { for (let i = 0; i < 20; i++) await Promise.resolve(); }
async function advance(ms) {
  const end = now + ms;
  while (true) {
    timers.sort((a,b) => a.at-b.at);
    if (!timers.length || timers[0].at > end) break;
    const timer = timers.shift(); now = timer.at; timer.fn(); await flush();
  }
  now = end; await flush();
}
(async () => {
  const send = context.window.fetch;
  const endpoint = '/api/2026-04/graphql.json';
  const old = await (await send(endpoint, { method: 'POST', body: JSON.stringify({
    query: 'query { cart(id: "x") { totalQuantity } }'
  }) })).json();
  const theme = send('/cart/add.js', { method: 'POST', body: '{}' });
  await flush();
  // App follows its completed read with a write while the Ajax job is waiting.
  const app = send(endpoint, { method: 'POST', body: JSON.stringify({
    query: 'mutation { cartLinesUpdate(cartId: "x", lines: []) { cart { id } } }',
    variables: { quantity: old.quantity }
  }) });
  await flush();
  await advance(2000);
  await Promise.all([theme, app]);
  assert.equal(quantity, 1, 'Current queue reproduces a stale app write after successful add');
  assert.deepEqual(events.map(e => e.kind), ['app:read', 'theme:add-one', 'app:write-old-quantity']);
  console.log(JSON.stringify({
    scope: 'Offline transport-queue reproduction; not Lana session evidence',
    initialQuantity: old.quantity, expectedQuantity: 2, actualQuantity: quantity, events
  }, null, 2));
  events.length = 0;
  const tappedAt = now;
  const delayedAdd = send('/cart/add.js', { method: 'POST', body: '{}' });
  await flush();
  for (let i = 0; i < 16; i++) {
    await send(endpoint, { method: 'POST', body: JSON.stringify({ query: 'query { cart(id: "x") { id } }' }) });
    await advance(500);
  }
  await delayedAdd;
  const addEvent = events.find(event => event.kind === 'theme:add-one');
  assert.equal(addEvent.at - tappedAt, 8000);
  console.log(JSON.stringify({
    scope: 'Offline simulation of repeated Storefront reads',
    requestDispatchDelayMs: addEvent.at - tappedAt,
    message: 'Theme add waits eight seconds before network dispatch; network time is additional.'
  }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
