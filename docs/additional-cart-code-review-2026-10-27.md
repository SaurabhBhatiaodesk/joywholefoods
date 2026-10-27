# Additional cart code review — 27 October 2026

Reviewed cart-page quantity changes, swap-note cleanup and checkout interception after PR25. These findings are separate from the deployed transport-queue fix. No production source or live settings changed in this review.

## 1. Changes on different cart lines share one debounce timer

**High confidence; offline reproduced.** `assets/cart.js:21` creates one debounced change handler for the entire CartItems element. `assets/global.js:223` cancels the previous timer on each event. A customer changing line 1 and then line 2 within 300ms dispatches only line 2's update. The first input can show an unsaved quantity before a section refresh restores it. The cart input uses `name="updates[]"`, so a later normal form submission might send its visible value; the confirmed defect is the missing Ajax update, not proof every checkout loses it.

Reproduction called the actual constructor's change listener twice and flushed the real debounce implementation's timer. Two requested updates produced one updateQuantity call.

## 2. Checkout cleanup ignores HTTP failures

**High confidence; offline reproduced.** `assets/cart.js:354` cleanup reads the cart, sends property changes around line 383 and a note update around line 415, but never checks `response.ok`. A fulfilled fetch returning 422/500 does not reject; cleanup returns true and the checkout handler continues. Swap requests or the final note can therefore fail silently. Its catch only handles thrown/network/JSON failures.

Reproduction returned successful GET JSON but HTTP 422 for every write. Actual cleanup method still returned true.

## 3. Swap cleanup resends old absolute quantities

**Confirmed unsafe code path; simulated interleaving, not a customer session.** Cleanup snapshots the cart then sends `quantity: item.quantity` with property edits (`assets/cart.js:391`). Quantity editing and cleanup do not share a logical read/edit lock. If a user quantity change finishes after that snapshot and before the property change, cleanup can restore the older quantity. Serializing transport alone does not update the stale body already built. A read of 1, intervening update to 2 and cleanup write of 1 reproduced final quantity 1 in a model using the actual cleanup method.

Properties changes also use original line keys. If app updates split/merge lines in the gap, the key can become stale; this is a risk, not separately reproduced here.

## Further risks to test

### Follow-up: two additional local reproductions

- **Premature cleanup success confirmed at method level:** held the first cleanup GET pending, called cleanup again, and verified the second returned true before the first finished. Combined with the five-second submitting reset, a repeat tap can proceed before cleanup completes. Full click/checkout browser reproduction not performed.
- **Stale swap-note overwrite confirmed in simulated interleaving:** actual `syncSwapItemsToCartNote()` snapshots old note, then posts a full replacement note. A modeled intervening customer note save was overwritten by the old note plus generated swap text. User note saves and automatic sync lack a shared logical read/write guard. This can affect delivery/dietary instructions; no real customer note modified in the test.

The audit diagnostic now reports five findings. These two reproductions do not change the deployed source or establish that Lana encountered them.

- `assets/cart.js:355` returns true immediately when cleanup is already running. Checkout-submitting guard resets after 5 seconds (`:467`) even if cleanup is still pending. A repeat tap on a slow connection can treat in-progress cleanup as completed. This control-flow issue is visible in code; no browser reproduction performed.
- No checkout guard explicitly waits for a pending cart-page quantity debounce before cleanup starts.
- Global cart change listener does not restrict events to quantity inputs. Its effect depends on which controls render within CartItems and needs DOM-specific testing.
- Footer preference save (`sections/main-cart-footer.liquid:465`) returns early when already saving and does not replay a later change. This is a preference/note persistence risk; not confirmed as a quantity bug.

## Evidence and scope

## 6–7. Custom-box failure recovery and duplicate submission

**Offline reproduced in the actual submit handler.** `assets/product-customize-box.js` is loaded by `sections/product-customize-box.liquid`, referenced by `templates/product.subscription-box.json`. This is a conditional template path; this audit does not establish which live products currently use it.

- A rejected add request leaves the button `aria-disabled=true`, its loading class active and spinner visible. The catch only logs; there is no finally/reset or visible error. This can leave a customer without a clear recovery action on a poor connection.
- The handler sets aria-disabled but never checks it on entry and does not natively disable the submit control. Calling the handler twice while its first request is pending sends two adds. Transport serialization alone does not deduplicate these intentional handler invocations. Actual browser tapping and any additional event interception need preview testing.

Run `node artifacts/custom-box-error-audit-2026-10-27.cjs`. It executes the unmodified handler with mock jQuery/DOM/network; no Shopify requests or orders are made.

Re-ran the existing six test files with `node --test tests/*.test.cjs`: **48 passed, 0 failed**. The seven audit findings above are separate reproductions, not passing regression tests or fixes. Production source remains unchanged by this review. No push or deployment performed.

Run `node artifacts/cart-code-audit-2026-10-27.cjs`. Results saved at `artifacts/cart-code-audit-result-2026-10-27.txt`. It runs actual cart class methods and debounce with a mock DOM/network and never contacts Shopify.

These are not claims that Lana's phone failure was caused by these paths. They affect cart-page editing/checkout and are not covered by the existing collection-card tests. PR25 only corrected the transport scheduling defect and remains a separate deployed fix.
