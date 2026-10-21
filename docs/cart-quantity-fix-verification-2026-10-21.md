# Cart quantity investigation — 21 October 2026

## Scope and deployment

Live theme was not edited or published. Browser work used existing draft theme
`186856833239` (Copy of Copy of joywholefoods/main). Its original card snippet,
collection-filter section and settings were backed up under artifacts before edits.
The draft has the updated card snippet and a minimal legacy-sync guard in its
collection-filter section. Other local file changes still require deployment.

## Findings fixed in code

- Initial cart reads could force-reset a control after a customer clicked it.
- Variant-change reads could similarly force-reset a newly pending quantity.
- Failed adds were retried even when a network failure could mean Shopify had
  already accepted the first add. Only rejected existing-line keys (400/404) now
  trigger a fresh read and one retry.
- Legacy collection/search sync could change the visibility of controls managed
  by the isolated quantity handler. It now skips those controls; sold-out notify
  handling remains available.
- Pending cart navigation now stops competing click handlers as well as the
  link's default navigation.
- Product-form error responses without a URL could throw before displaying the
  Shopify error. Error handling now guards the URL, displays uncertain network
  failures and suppresses success notifications on failure.

## Browser results

1. Original browser cart contained Granny Smith apples ×1 and eggs ×5.
2. First draft rapid-add run reproduced the reported symptom: basil displayed ×2
   but the first cart render contained ×1, and asparagus was absent. This was
   before the stronger navigation propagation guard. The exact request-level
   cause was not captured, so this is not proof that the guard was the sole cause.
3. After the guard, rapid basil/asparagus quantity changes followed immediately
   by Cart navigation retained basil ×3 and asparagus ×2, plus Asian greens ×1.
4. Changing basil to ×2 then immediately opening Cart retained ×2, with a line
   total of $13.00 at $6.50 per bunch.
5. Joy's draft app embed was temporarily disabled. Its embed script was absent
   in the inspected collection DOM. Increasing basil and Asian greens then
   navigating immediately retained basil ×3 and Asian greens ×2. This is a
   theme-embed comparison, not an uninstall or a test of all backend Joy behaviour.
6. Original draft settings were restored and copied back from the editor:
   exact original text matched and Joy disabled=false.
7. Only products introduced by these tests were removed; original apples/eggs
   were preserved. No order or payment was submitted.
8. At a 390 × 844 browser viewport, selecting basil Bunch, adding, increasing
   to ×2 and opening Cart retained ×2 and $13.00. This is responsive desktop
   browser testing, not a real iPhone or Android test. The viewport was reset.

Evidence: `artifacts/cart-basil-two-draft-proof.png`,
`artifacts/cart-rapid-quantity-draft-proof.png`, and
`artifacts/cart-joy-off-draft-proof.png`.

## Local verification

27 Node tests passed: serialized production queue under delayed responses,
rapid changes across three cards, stale reads, failed writes, removed line keys,
navigation waits, legacy sync guards, PDP confirmation and product-form errors.
Liquid parsing and static JavaScript parsing passed for the four edited Liquid
files; product-form.js syntax and git diff whitespace checks also passed.
These tests do not simulate actual Shopify traffic on a throttled real phone.

## History and confidence

Available Git history begins 9 October 2026. The baseline already includes the
legacy card handlers, so this repository cannot date their introduction against
the Joy launch. The 21 October changes introduced serialized collection writes
and navigation guards; earlier 13–15 October edits concern grouping and styling.
No attribution to a particular team is supported by this history.

Confidence is high in the reproduced code defects and their regression coverage.
Stephanie's historical order discrepancy has not been correlated to a session,
and Joy is not established as the root cause. The old Simple Bundles embed was
enabled in the draft settings; it was not disabled or changed in this work.

## Still required before calling the entire incident resolved

- Real iPhone/Android, private-window and authorized returning-account tests.
- Actual throttled-network request cancellation/overlap capture.
- Joy Clarity project access (existing account previously received a permissions
  error), plus customer attempt dates/times for targeted recordings.
- Current Joy/Bird app diagnostics and affected historical order/session evidence.
- Deploy and verify the full reviewed change set before claiming a live fix.

## Follow-up to the supplied live-theme reproduction report

The user supplied a 20-add live-theme test with five lost adds and an idle
MutationObserver loop. Those figures are user-supplied evidence, not measurements
from this agent's browser session.

The local observer now filters mutation records for newly inserted quantity
controls or containers containing those controls. It does not react to labels,
icons or arbitrary widget changes. New-card initialization uses cached cart state
instead of forcing another cart request. This removes the broad observer read
path rather than relying on clearing its own mutation records.

Weight selection now exposes a visually muted, focusable “Choose a weight”
button with aria-disabled=true until a weight is selected. Tapping it focuses the
weight selector and makes no cart write. Selecting a weight clears that state.
A visible “Use + to add more” hint explains the quantity stepper.

31 local tests pass. The production queue was additionally exercised with four
distinct adds 150 ms apart for five rounds against a simulated server taking
200 ms per write: 20/20 persisted with maximum concurrent writes=1. This is not
the requested live Shopify or real-phone 20-add acceptance test. Another test
passes 100 idle label mutations to the actual observer callback: zero reads.

Simple Bundles removal, Recharge active-subscription confirmation, third-party
CommSlayer polling verification, and the final real-phone/network acceptance test
remain separate outstanding checks. These integrations have not been removed.

Deployment attempt for this follow-up: Shopify's Themes library and the draft
code editor repeatedly remained at approximately 95% loading with an empty
embedded frame, including after reload. Therefore the follow-up observer and
weight-button changes are local/Git changes, not deployed draft changes. No
live 20-add result or whole-page idle network measurement is claimed.

The installed-apps list was inspected across all three pages. Simple Bundles
and CommSlayer are installed; Recharge was not listed. That does not verify
whether externally billed Recharge subscriptions remain, so its leftover theme
SDK has not been removed on this evidence alone.
