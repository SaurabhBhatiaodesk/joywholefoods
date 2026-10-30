# Merged cart fixes: browser retest, 27 October 2026

## Deployment verified

- PR27 merged into main: `2d5c0bddc90388a1b30f095bdb54fbf46dc3b6a8` (source `8c96a80`).
- Follow-up PR28 merged: `48afc67ea96493bfd0f09021539c4dd0b0831565` (source `0df48ce`).
- Supplied preview theme 186455818455 loaded the new beforeunload handler, stable line-key attributes, and updated cart.js asset. After PR28 sync, rendered script contained the saving status text and no old 15-second retry alert.

## Browser results

1. Desktop Chrome: added Bay Leaves, Chives, Kaffir Lime Leaves, Rosemary, then four further + rounds. Twenty requested units. Guarded Cart navigation eventually showed 5/5/5/5. Reload preserved all twenty.
2. The first desktop run exposed the old guard stopping automatic navigation after 15 seconds and asking for another click. Fixed in PR28: non-blocking saving message and continued automatic waiting. A 30-second local pending-queue test passes.
3. Cart + controls on separate lines saved. Final observed quantities were Rosemary 7, Kaffir Lime 5, Chives 6, Bay Leaves 6. Direct automation fill/Tab did not establish reliable manual text-entry behavior; do not count it as a passed manual-input test.
4. Delivery postcode 4059 and 31 October selected. Checkout loaded with subtotal $112.35 and delivery $14.50, total $126.85. No contact/payment details entered, no purchase made.
5. After PR28, responsive Chrome: requested 390x844 override, observed document width 376 CSS pixels. Twenty adds across the same four products. A single Cart click showed saving status, then navigated automatically, without the old retry alert. Cart showed 5/5/5/5; reload preserved all twenty. This is browser viewport testing, not a real phone.
6. Cleared only this test cart and verified empty/0 items; reset viewport override.

## Automated validation

60/60 local tests pass. Shopify validation passes (existing unused-variable warning in card snippet); JavaScript syntax checks pass. Custom-box network/422 and duplicate-submit cases are local mocked tests, not live product purchase tests.

## Limits

No real iPhone/Android, returning-customer login, completed order, renewal billing, or Box Label test. The App Proxy login console error remains observed and its impact unconfirmed. Forced exit can still abandon unsent jobs; native beforeunload is not guaranteed on mobile. These results establish the specific tested paths, not that every customer-reported incident is resolved.

## Evidence

- `artifacts/cart-pr27-merged.png`
- `artifacts/cart-pr27-20-units-persisted.png`
- `artifacts/cart-pr27-checkout.png`
- `artifacts/cart-pr28-mobile-saving.png`
- `artifacts/cart-pr28-mobile-20-persisted.png`
