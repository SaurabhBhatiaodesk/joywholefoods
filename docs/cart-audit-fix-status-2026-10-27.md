# Actual cart code changes — 27 October 2026

This change contains production source edits, separate from audit-only PR26.

## Implemented

- Independent, captured quantity changes for each cart line. Inputs include their line key so a queued edit does not silently address a different index after a removal.
- Checkout flushes unsent quantity changes, waits for writes, and blocks preparation after a failed quantity update.
- Checkout cleanup checks HTTP responses and shares in-progress work rather than claiming premature success. The five-second tap reset starts after preparation finishes.
- Swap property changes do not resend a stale quantity. A sole private swap property is retained instead of submitting an invalid empty properties object; the readable swap value still goes into the note.
- Swap note generation uses the current cart note input when present, rather than fetched older instructions.
- Custom-box submissions are scoped to the submitted form, prevent duplicate in-flight submits, report rejected adds, and always reset loading after network/API errors. Accepted adds without a usable cart renderer navigate to cart without retrying the add.
- Collection pages request the native browser reload/close warning while card changes are pending.

## Verification and limits

12 new local regression tests execute the changed methods/handlers with mocked network/DOM. Existing 48 tests are retained. JavaScript syntax checks pass. Shopify validation of all five changed theme files passed with pre-existing warnings.

This is **not** proof of a fixed live customer session. Browser acceptance of a forced reload/close still abandons unsent work; mobile browsers may not show beforeunload. No automatic retry of uncertain adds is introduced. The new reload guard does not eliminate app-originated stale writes or prove that they caused the previous preview mismatch.

Reading the live note input mitigates the reproduced editor race; a separate app/tab changing a note after a snapshot is still outside that guarantee. Shipping/payment, real-device testing and Joy/Bird integration need preview regression testing before release. The connected Shopify API account belongs to a different store, so it must not be used to deploy these files to Joy.

No main merge or theme deployment is included in the local test result. Historical reproduction scripts in artifacts assert the old failure behavior and are not the updated regression suite.
