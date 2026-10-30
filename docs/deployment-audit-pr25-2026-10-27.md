# Deployment and storefront audit — 27 October 2026

## Deployment

- PR https://github.com/SaurabhBhatiaodesk/joywholefoods/pull/25 merged to main, merge commit `fef2caa8864283dc2107739812c5aa054667e491`.
- Read actual rendered homepage script after merge: new `transportQueue` and slow-body clone guard present, old `MAX_WAIT_MS = 8000` absent. This confirms storefront delivery of the fix, beyond GitHub merge alone.
- 48 automated tests and Shopify Liquid validation passed before deployment.

## Live checks completed after deployment

| Surface | Observed result |
| --- | --- |
| Homepage featured eggs quick-add | Added one; cart persisted quantity 1 |
| Eggs PDP main add | Cart increased to 2 |
| Eggs PDP sticky add | Both confirmation buttons became Added to cart; cart later showed 3 |
| Herbs collection, selected Basil Bunch | Add produced 1, middle Added label increased to 2, cart persisted 2 |
| Weight placeholder | Visible Choose a weight; DOM-native button not disabled but aria-disabled=true. Forced semantic click used only to bypass automation's ARIA-disabled refusal; focus moved to weight picker. It did not add anything. Selecting Bunch enabled normal Add to cart. |
| Search results | Basil results rendered, variant selection synchronized existing cart quantity 2; did not perform an additional search-card add |
| Predictive search | Search overlay showed Basil and other products; Close worked |
| Cart/date/checkout | Basil x2 + eggs x3 = $51.85; 4059 available, 31 October selected; checkout showed Delivery ($12.50) + $2 Temp Fuel Levy and total $66.35 |
| Cleanup | Removed only audit Basil and eggs. Cart empty confirmed. No order/payment placed. |

Phone-width browser testing used the selected cart tab. The viewport API affected the selected tab, not the other background tab; corrected the target and verified actual CSS width 390 before Basil control testing. No claim of real iPhone/Android coverage.

## Additional findings — not established ordering blockers

- Homepage **Build My Subscription** CTA points to an external Google Form while header SUBSCRIBE points to `/pages/build-your-subscription`. Confirmed both in rendered DOM and `templates/index.json` lines 202–203. Could be an intentional lead form; not silently replaced during transport deployment.
- Console contains `Failed to log in via Shopify App Proxy: pr` on homepage and eggs PDP. Adds succeeded despite it; responsible app and customer impact not established. Another message-channel error may be browser-extension related; no attribution made.
- Clarity project access and Shopify authenticator blocks remain as documented in the Lana investigation. No Lana recording obtained.

## Limits

This is a representative ordering-flow audit, not an exhaustive test of every product, route, browser or app. Live exact 150ms rapid-add batch timing, real phones, private/login returning customers, subscription renewal billing and Box Label fulfillment are not verified in this post-deployment run. The transport fix's 1.5-second continuation assumption and unsupported transport paths remain documented in `cart-queue-fix-2026-10-27.md`.

Proof: `artifacts/cart-pr25-merged-2026-10-27.png`, `artifacts/live-pdp-added-pr25-2026-10-27.png`, `artifacts/live-checkout-pr25-2026-10-27.png`.
