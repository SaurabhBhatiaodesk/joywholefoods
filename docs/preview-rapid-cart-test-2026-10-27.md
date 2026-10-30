# Preview cart test — 27 October 2026

Theme requested: 186455818455. Chrome desktop browser, herbs/spices collection. Started with an empty cart. No payment or order placed.

Clicked Add to cart for Bay Leaves, Chives, Kaffir Lime Leaves and Rosemary, then clicked each product's + control in four more rounds. Browser automation clicked sequentially without explicit delay; this is not a measured 150ms test. Each round's DOM labels showed 2/2/2/2, 3/3/3/3, 4/4/4/4, then 5/5/5/5.

Reloaded immediately after the final round. Collection labels settled at Bay Leaves 2, Chives 1, Kaffir Lime Leaves 5, Rosemary 1. Navigated through the Cart link: cart inputs confirmed the same quantities, total $40.90. Expected 20 units based on taps; 9 persisted in this observation.

**Result: fail — optimistic card quantities did not match the cart after immediate reload.** This run did not inspect HTTP responses or wait for the pending queue before reload. It does not distinguish unsent/in-flight writes abandoned by reload from accepted writes overwritten later. Do not describe this as proven Shopify lost 200-response adds. Further request tracing is needed.

Console also contained Shopify App Proxy login errors and a Shopify message origin mismatch. Their causal relationship to the quantity issue is unverified.

Screenshot: `artifacts/preview-cart-mismatch-2026-10-27.png`.

Cleanup: individual fast remove taps did not remove every line; used the visible Clear Cart link and verified "Your cart is empty" / 0 items. Only products added in this test were present. No source changes, deployment, real-device test or complete checkout performed in this run.
