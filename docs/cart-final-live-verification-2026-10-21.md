# Cart quantity verification, 21 October 2026

PRs 18 and 19 were approved by the user, merged, and their code presence was verified on the public storefront outside draft preview.

## Findings and changes

- Bird Storefront `cartLinesUpdate` and `cartAttributesUpdate` requests overlap theme Ajax mutations. The previous collection-only queue did not cover those requests. A shared fetch queue now serializes same-store Ajax and Storefront cart mutations. Reads and unrelated traffic remain outside it. XHR mutations and writes from other tabs are not covered.
- Cart lines can split when apps change properties. The collection control previously read the first matching variant line. It now totals matching lines, preserves existing properties/selling plan when adding, and decreases across matching lines sequentially.
- Earlier low-count reports did not consistently account for split-line totals. They must not all be described as proven lost items. A fresh run after PR18 had five of each item in total but Rosemary and Kaffir were split 4+1 / 1+4.
- Positive clicks use incremental adds, with no pre-add GET when the queue has a snapshot. Cart reads bypass browser caching.

## Live UI checks after PR19

Collection: https://joywholefoods.com.au/collections/local-organic-herbs-and-spices-delivery

Five rounds of four consecutive plus-button clicks (20 total; not a measured 150ms interval):

| Product | Baseline | Expected | Persisted cart |
| --- | ---: | ---: | ---: |
| Dill, Bag | 5 | 10 | 10 |
| Garlic, 30gm | 5 | 10 | 10 |
| Rosemary | 9 | 14 | 14 |
| Kaffir lime leaves | 9 | 14 | 14 |

- Middle Added label: Rosemary 14 → 15, persisted.
- Minus control: Kaffir 14 → 13, persisted.
- Responsive desktop browser at 390×844: selected Garlic 30gm and incremented 10 → 11, persisted.
- Original apples ×1 and eggs ×5 remained unchanged.
- Removed all test herb lines and confirmed the original two cart lines remained. No order placed.
- 41 automated queue, race, split-line, diagnostic, PDP and error-handling tests passed. Liquid/static JavaScript parsed and diff checks passed.

## Limits and remaining acceptance

- Real iPhone/Android, returning-customer account, private-window, subscription purchase and Box Label/order checks are not completed in this run.
- Exact 150ms four-add test repeated five times and request cancellation analysis are not established by serial UI clicks.
- No fresh confirmation of zero idle app cart reads. CommSlayer rendered code still includes a 60-second fallback poll.
- Simple Bundles and Recharge still load; no app removal performed and active Recharge subscriptions have not been ruled out.
- Clarity recordings remain unavailable to this account. No customer-specific causal conclusion for Stephanie, Danielle or Tracy.
- Bird is confirmed to write cart line attributes; this run does not prove it is the sole cause of all customer failures. Split lines may still exist, and they are now counted correctly.

Proof: `artifacts/cart-final-live-proof.png`, `artifacts/cart-final-mobile-proof.png`.
