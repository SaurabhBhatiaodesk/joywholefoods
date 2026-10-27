# Cart queue correction — 27 October 2026

## Change

`snippets/cart-write-queue.liquid` now separates the theme's waiting queue from the actual request transport queue. A cart app's write following its read can use the transport while the theme is waiting, so the app's older snapshot is not intentionally scheduled after the theme's add.

New cart reads wait behind already-pending theme writes. Repeated background reads therefore cannot extend the old eight-second wait. Unrelated GraphQL requests and external hosts bypass arbitration. Cart writes remain serialized; no failed or uncertain mutation is automatically retried.

The cart-read continuation window starts after a cloned response body finishes downloading, rather than at response headers. The original response is returned unchanged and is not consumed. This handles a slow response body without releasing the theme add prematurely.

## Validation

- Regression executed against the pre-fix HEAD snippet: failed with request order `read → add → app-write`.
- Same regression against corrected snippet: passes with `read → app-write → add`; modeled quantity stays **2** rather than reverting to **1**.
- Repeated cart reads: pending add dispatches after the original **1500ms** continuation window in the deterministic test, rather than waiting **8000ms**. This is an offline result, not a live speed measurement.
- Added slow app-write, delayed cart-response-body, new reads after pending adds, failure recovery, and unrelated polling tests.
- Updated two existing isolated card test harnesses for the current production confirmation-read and self-heal callback interfaces. Added the missing self-heal callback boundary stub to the rapid-add harness; production card code was not changed.
- `node --test --test-timeout=15000 tests/*.test.cjs`: **48 passed, 0 failed**. Includes simulated four-add batches 150ms apart, five rounds; split lines; quantity changes; navigation; PDP confirmation; stock and network errors.
- Shopify Liquid validator: **VALID**, artifact `cart-queue-mobile-fix`, revision 2.
- `git diff --check`: passes.

## Deployment and limits

- Local branch: `fix/cart-lock`. No push, merge or Shopify upload/publish performed in this task. Live storefront still has the previous queue.
- Lana's specific cause is not confirmed: Shopify verification and Clarity project access are still unavailable. Responsive Chrome test is not a real iPhone/Android test.
- Arbitration still uses a 1500ms app continuation window. An app that computes and sends an old snapshot after a longer gap needs app-level integration/coordination; this patch cannot make arbitrary multi-request app logic atomic.
- Intercepts recognized same-store fetch Ajax cart writes and JSON-string-body Storefront cart operations. XHR, other tabs, worker requests, persisted GraphQL queries and Request-body-only GraphQL operations are not newly covered.
- Before live rollout, verify this branch in a duplicate theme with actual Joy/Bird flows and real phones. Actual customer renewal/payment testing remains separate from this cart transport correction.
