# Live cart verification after PR 13

- Remote main: `856f841`, contains fix commit `871017a`.
- Exited Shopify draft preview before testing. Live collection script contains `deltaVariantId`, `handleLabelClick`, and `containsNewQuantityCards`.
- Page: https://joywholefoods.com.au/collections/local-organic-herbs-and-spices-delivery
- Baseline cart: Granny Smith apples 1kg ×1; eggs ×5. No test herbs present.
- Selected Dill Bag and Garlic 30gm. Clicked Add to cart once on Dill, Garlic, Rosemary, and Kaffir lime. Then clicked each middle Added label in four successive rounds (20 UI clicks total). These were automated consecutive UI clicks, not a measured 150ms interval.
- Clicked cart link after the final round. Read quantities from the resulting cart page inputs.

| Product | Expected | Actual |
| --- | ---: | ---: |
| Dill, Bag | 5 | 4 |
| Garlic, 30gm | 5 | 2 |
| Rosemary | 5 | 3 |
| Kaffir lime leaves | 5 | 2 |

Result: FAIL. The merged changes are present on the live page, but the UI-click sequence did not persist the expected quantities. This test does not establish whether all clicks produced requests, whether requests failed, or whether quantities were subsequently overwritten. Request-level instrumentation is needed to distinguish those causes; do not claim that eight successful writes were lost.

Removed only the four test herb lines. Confirmed original apples ×1 and eggs ×5 remain.

Browser log on final cart page included an app-proxy login error and a Shop message origin mismatch. Neither is established as the cart issue's cause.

No checkout/order placed. No real iPhone or Android testing performed in this run. This is not a full acceptance sign-off.
