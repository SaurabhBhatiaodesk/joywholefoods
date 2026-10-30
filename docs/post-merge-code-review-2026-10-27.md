# Post-merge code review — 27 October 2026

Read-only production-source review of the PR27–30 cart changes. No source edits, push or deployment performed during this review. Existing suite: 65/65 pass. Two additional method-level reproductions run separately using `node artifacts/post-merge-review-2026-10-27.cjs`.

## P1: stale-key recovery does not preserve selling-plan identity

`assets/cart.js:182–183` matches only variant and normalized properties. Original selling plan is neither captured in the cart input nor checked against `selling_plan_allocation` in candidates. If a stale subscription line has disappeared while a one-time line with the same variant/properties remains, the unique remaining line passes and receives the subscription line's requested quantity. Same risk applies to different subscription plans. This does not convert a subscription: it changes the wrong existing line.

Confirmed using the actual updateQuantity method: original key `123:old-subscription`, only a same-variant/property one-time candidate remaining -> second write targeted `123:one-time`. This is a simulated interleaving, not a production customer recording.

Fix direction: capture original selling-plan ID, including explicit one-time/null identity, with the line snapshot; require an exact selling-plan match in recovery, and fail closed if original identity is unavailable.

## P2: checkout handler retains a replaced cart drawer instance

`assets/cart.js:88–105` can replace the `cart-drawer-items` custom element. `:511–512` prevents any subsequent checkout handler binding using a body-wide flag. The original document click closure still invokes `this.cleanupSwapPropertiesBeforeCheckout()` at `:543` on the original element. Quantity timers/writes on the newly connected drawer therefore are not the ones its checkout preparation flushes. A stale failure flag on the old instance can also block the new drawer.

Confirmed by executing the actual binding method twice with old and replacement controllers: one checkout invokes old cleanup once and replacement cleanup zero times. End-to-end customer impact depends on a drawer replacement followed by checkout while the replacement has pending changes. This is not proof of the currently tested cart-page path failing.

Fix direction: a single document listener should resolve the current connected cart/drawer controller at checkout time, and flush all relevant active pending quantity operations before submitting.

## Verification limits

The 65 passing tests do not cover these two newly reproduced cases. No additional live checkout test was performed in this review. Existing successful desktop/mobile-width tests remain valid for their particular paths, not as a guarantee that no other path can break.
