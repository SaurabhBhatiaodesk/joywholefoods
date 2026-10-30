# Mobile ordering investigation — Lana report, 27 October 2026

## Conclusion

Found a reproducible unsafe ordering case and a dispatch delay in the current theme cart transport queue. This is a credible cause of apparent unresponsive adds / reverted quantities. It is **not yet established as Lana Rolley's cause**, and is not exclusive to mobile. Slower networks and background app requests can make its delay more noticeable on phones.

No production theme or app settings changed during this investigation. Only offline diagnostic/report artifacts were added. No purchase made.

## Confirmed code evidence

- Local current HEAD `cf98ad12d2d256079b36519c2bb21f64b8851c22`, 22 October: “Cart write queue: hold theme cart writes while an app's Storefront read/write burst runs”.
- The same queue signatures were read from the live collection's rendered script DOM: `APP_QUIET_MS = 1500`, `MAX_WAIT_MS = 8000`, and `appBusy() || ajaxWritesPending === 0`.
- `snippets/cart-write-queue.liquid`: all Storefront requests extend the quiet window, including reads (lines 49–74). Ajax writes enter the shared queue and wait for quiet (line 104 onwards). An app mutation from a continuing burst also joins that queue (line 93), behind the waiting Ajax write.
- Offline execution of the actual current snippet with mock cart responses and deterministic timers reproduces:
  1. App reads existing quantity 1.
  2. Customer's incremental add waits 1500ms and updates quantity to 2.
  3. App write based on its old read is dispatched afterwards, restoring quantity 1.
- Second modeled scenario: background Storefront queries every 500ms cause a theme add to wait **8000ms before network dispatch**. Network latency would be additional. This is not a measured live/mobile latency result.
- Reproduction command: `node artifacts/cart-burst-reproduction-2026-10-27.cjs`.
- Result: `artifacts/cart-burst-reproduction-result-2026-10-27.txt`.
- The synthetic stale app write intentionally models an app updating an existing line with its previously read quantity. It does not prove Bird or any specific app actually sent that write in Lana's session.

## Mobile-width browser test

Collection: `/collections/organic-spray-free-farm-fresh-fruit-and-veg-box-delivery-brisbane-gold-coast`, viewport 390×844.

- Organic Staples Box quick add displayed the swap popup.
- Heading, text field, No swaps and Save swaps visible in screenshot.
- No swaps completed; cart showed Organic Staples Box ×1 / $89.
- Removed only that temporary Organic Staples Box and confirmed cart empty afterwards. Initial collection header had no numeric cart badge; no inference about the earlier purchase session's cart persistence should be made.
- Viewport reset after test.
- This is desktop Chrome with responsive width, **not a real iPhone/Android or mobile Safari test**. Popup close/keyboard/saved account/checkout on an actual phone not verified.
- Screenshot: `artifacts/mobile-swap-popup-2026-10-27.png`.

## Access constraints / customer evidence

- Shopify Orders search for Lana Rolley reached an authenticator verification prompt. Asked user to complete it directly; prompt still present. Successful order time and phone failure time not obtained. Do not handle/print authentication codes.
- Public storefront DOM identifies Clarity project **sp9mw3qhk6**.
- Opened https://clarity.microsoft.com/projects/view/sp9mw3qhk6/dashboard . Logged-in Clarity says “This project doesn't exist or you don't have permissions to view it.” Previous unrelated projects cannot supply this store's recordings.
- Proof: `artifacts/clarity-joy-access-blocked-2026-10-27.png`.
- No Lana recording was accessed; device/browser, failure step, dates/times remain unknown.

## Existing automated tests

`node --test tests/cart-write-queue.test.cjs` currently fails 2/2. One failure is an outdated harness lacking `window.setTimeout`; the other assumes Storefront queries execute synchronously. These failures are **not themselves storefront runtime errors**. The independent diagnostic includes real timer behavior via a deterministic clock and demonstrates the queue ordering issue separately.

## Next fix / validation scope

Replace the heuristic quiet-window scheduling with arbitration that lets an already-started app read/write burst finish before a queued theme mutation, while bounding starvation and preserving error/response semantics. Simply shortening the delay or removing serialization reopens previous races. Test app read → theme add → app write, rapid increments, split lines, unrelated GraphQL traffic, failures and page navigation before proposing live deployment.

Lana-specific attribution still requires her session evidence; authentication and Clarity access are separate from the reproducible queue defect.
