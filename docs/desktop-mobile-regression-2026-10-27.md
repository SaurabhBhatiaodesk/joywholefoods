# Desktop and mobile-width regression — 27 October 2026

Tested supplied preview theme 186455818455 in Chrome. Desktop plus requested 390x844 override (observed responsive document width 376 CSS px). No payment or order placed.

## Desktop

- Garlic 30gm selected on collection card, add and + produced quantity 2 on the correct variant.
- Actual keyboard entry changed garlic to 3; saved value and page reload confirmed 3.
- Eggs main PDP add reached cart. Sticky add also reached cart after hiding Shopify's preview toolbar, which had obscured the lower control during initial automation. Final cart held eggs 2 and garlic 3. Do not classify the toolbar obstruction as a customer storefront defect.
- The short-lived success label was not captured reliably during this run; previous automated confirmation tests remain the evidence for its timing/style.

## Mobile-width

- Box swap popup opens. Close cancels without adding; cart remained 0.
- No swaps added one box.
- Save swaps added a separate box line carrying the entered QA swap request. Same variant with distinct properties stayed on separate lines.
- Increasing the swapped line initially failed with visible `no valid id or line parameter`; checkout correctly blocked the failed save. This was not counted as a pass.

## Fix and retest

PR29 (`27523c0` merge) adds one recovery attempt for an explicitly rejected stale-key change. It resolves the unique same variant/properties line from a fresh cart, ignoring BirdChime delivery metadata. Ambiguous/different swap lines, stock errors and uncertain network writes are not retried blindly.

Deployed Liquid markup exposed properties as arrays of pairs. PR30 (`5e3e141` merge) normalizes those and Ajax property objects to the same signature. Verified the updated cart asset deployed.

Retested quantity increase while postcode/date were updated: swapped line saved **2**, plain line remained **1**. Checkout opened and showed those exact quantities and swap text: subtotal **$267**, local delivery levy **$2**, total **$269**. No payment details entered.

65/65 local tests pass; JS syntax and Shopify validation pass with existing Liquid warnings. Evidence: `artifacts/mobile-checkout-swap-retest-2026-10-27.png`.

Previous PR27/28 testing separately verified 20-unit rapid-add/reload persistence on desktop and mobile-width layouts. This run extends coverage to weight selection, manual entry, main/sticky PDP controls, swap close/no-swap/save and box checkout.

Limits: responsive Chrome, not physical phones; no authenticated returning-customer, recurring billing, completed order or Box Label verification. App Proxy login console error still observed; its customer impact remains unconfirmed. Do not claim every possible mobile/customer incident is fixed.
