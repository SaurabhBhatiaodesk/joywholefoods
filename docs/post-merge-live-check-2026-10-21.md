# Post-merge live check — 21 October 2026

The live Herbs & Spices collection contains the observer filter and weight-label
changes. No preview bar was present; the collection section IDs were the live
27962612220119 series. The live script also contains requestDelta, from later
changes made outside this agent's previous patch.

Remote main changed during this check: 979cb96 (PR #11) to 14218ad (PR #12,
containing 7caa18f). The workspace additionally contains f1137e4. Do not treat
the earlier 31-test result as verification of these later delta handlers: those
tests exercise the previous queue path.

An initial repeated sequence was interrupted by browser automation timeouts and
must not be reported as a completed 20-click/150-ms test.

A subsequent stable baseline was Dill=3, Garlic=4, Rosemary=2, Kaffir=3. Clicking
each plus once persisted Dill=4, Garlic=5, Rosemary=3, Kaffir=4 in the cart.
Repeating the batch after reloading the collection produced Dill=5, Garlic=5,
Rosemary=4, Kaffir=5. Garlic was expected to be 6. The cart input values were read
directly from the rendered DOM. Screenshot:
artifacts/live-cart-post-merge-mismatch.png.

Garlic's collection variant JSON showed inventoryQuantity=1000000, max=null and
step=1 for both variants. The collection's displayed rules do not explain a
five-item cap. No HTTP request/response capture was available in this check,
so the missing increment's exact cause remains unconfirmed.

The initial cart was empty. All four introduced test products were removed and
the empty-cart state was verified. No order or payment was submitted. This agent
did not change or publish theme code during this post-merge check.

Result: live release is NOT signed off. Full 20-add timing/network verification,
idle request measurement and real-device testing remain outstanding.
