# Joy Wholefoods repository handover

Prepared 29 October 2026. This describes the checked-out source; Shopify Admin configuration and deployed theme state must be verified separately.

## Repository and access

| Item | Location |
| --- | --- |
| Git repository | https://github.com/SaurabhBhatiaodesk/joywholefoods |
| Storefront | https://joywholefoods.com.au/ |
| Shopify Admin | https://admin.shopify.com/store/sprayfreefarmacy |
| Main integration branch | `main` |
| Previously supplied preview theme | `186455818455`; confirm its current name and role in Admin |

Use authorized Shopify staff access and Git credentials. Never commit tokens, customer details, payment information or session cookies. Confirm the store identity before using any connected Shopify tool.

## Local setup

This is a Liquid theme, not a Node application. There is no root `package.json` or application build command. Node.js is used by the repository's built-in regression tests. Shopify CLI is optional for theme preview and upload; install and authenticate it separately using current Shopify instructions.

```powershell
git clone https://github.com/SaurabhBhatiaodesk/joywholefoods.git
Set-Location joywholefoods
git status --short
git fetch origin
git switch -c fix/your-change origin/main
```

Start from a clean checkout. If working files already exist, inspect and preserve them before switching branches or pulling. Do not reset, clean or stage the entire workspace to prepare a deployment.

## Directory map

| Path | Responsibility |
| --- | --- |
| `layout/theme.liquid` | Page shell, shared script inclusion and legacy featured-collection quantity logic |
| `templates/` | Page templates and section composition |
| `sections/` | Product, collection, cart and other editable page sections |
| `snippets/` | Shared cards, variant pickers, buy buttons and cart infrastructure |
| `assets/` | JavaScript, styles and static theme assets |
| `config/` | Theme settings schema and saved settings, including app embed configuration |
| `locales/` | Translations |
| `tests/` | Node regression tests with mocked browser/cart behavior |
| `docs/` | Setup instructions and dated investigation reports |
| `artifacts/` | Screenshots and diagnostic evidence; historical scripts may reproduce old failures |

## Custom behavior and editing locations

### Collection cards and quantities

`snippets/card-product.liquid` contains the custom card UI and substantial inline quantity logic. It handles option selection, optimistic quantity display, queued operations and cart-navigation protection while saves are pending.

Some additional featured-collection quantity handling remains in `layout/theme.liquid`. Review both code paths when changing selectors or shared quantity behavior. Avoid registering duplicate handlers for the same controls.

`assets/custom.css` contains site styling and scoped collection fixes. Meal-option cards receive `card-wrapper-os--meal-options`; their collection add buttons use `#087840`. Other selectors and section styles can also affect button appearance.

### Cart request coordination

`snippets/cart-write-queue.liquid` wraps fetch requests and coordinates recognized theme and app cart requests. It is rendered near the beginning of `layout/theme.liquid`.

Preserve response bodies, errors and request order when modifying this layer. Do not add automatic retries to uncertain add requests: a successful request with a lost response can otherwise create duplicate quantities. The queue does not establish coordination across separate browser tabs or every possible third-party transport.

### Cart page and drawer

`assets/cart.js` manages quantity changes, error reporting, section refreshes and checkout waiting for pending saves. Cart markup in `sections/main-cart-items.liquid` and `snippets/cart-drawer.liquid` supplies line keys, properties and selling-plan identity.

Line keys can change after app updates. Existing recovery logic requires a unique compatible line and preserves subscription identity. Do not replace this with a first-variant match or stale numeric line index. Liquid-rendered properties and Ajax cart properties can have different JSON shapes.

### Product forms and confirmation

`snippets/buy-buttons.liquid` contains PDP confirmation behavior. `assets/product-form.js` handles the ordinary product form, and `assets/product-customize-box.js` handles custom box submissions. Verify both main and sticky buttons when changing success states.

The intended PDP confirmation is a green Add to cart button before submission, with white background and green border/text after success. A failed add must not appear successful.

### Product option placeholders

`snippets/product-variant-options.liquid` renders dropdown placeholders marked `data-joy-placeholder-option`. `VariantSelects.setInputAvailability()` in `assets/global.js` skips those placeholders while updating real option availability.

This preserves “Select meal preference” after selecting a meal count. Actual unavailable option values continue through the existing availability logic. This fix was pushed to `main` as `32d70db`; deployment and browser verification are separate checks.

### Grouped meal-box products

`snippets/product-group-options.liquid` renders sibling product links for meal/diet combinations. This is separate from the ordinary multi-variant Organic Meal Kits Box dropdown.

See [Weeknight Dinner Box setup](weeknight-dinner-box.md) for the metaobject, product metafields and default listing rules. The implementation uses normal product navigation; optional in-place section swapping is not implemented. Joy bundle configuration belongs to the merchant/app workflow, not this theme code.

## External configuration boundaries

Joy Subscriptions, Bird delivery configuration, shipping profiles, subscription contracts and review grouping cannot be established from theme source alone. Theme settings can contain app references without proving their current operational state.

Do not remove app embeds or move shipping-profile products solely because their files look unused. Check active contracts and app dependencies first. Subscription renewal shipping requires a separate contract/renewal check; a checkout screenshot alone does not prove recurring billing behavior.

## Automated validation

Run from the repository root:

```powershell
node --test tests/*.test.cjs
node --check assets/global.js
node --check assets/cart.js
git diff --check
```

The tests cover collection queue/race behavior, shared cart writes, diagnostics, PDP confirmation, product form failures, cart preferences, stale line-key recovery and current cart-controller selection. They use mocks and do not replace browser, app integration or payment tests.

Run Shopify Liquid/theme validation for changed Liquid files. Historical reproduction scripts under `artifacts/` may assert the old broken behavior; they are evidence, not the maintained regression suite.

## Browser regression checklist

Use a duplicate theme preview first, and record the exact theme ID, URL, date and viewport. Check whether an old preview cookie is active before calling a test “live”.

1. Collection: add four different items quickly, repeat five rounds, then verify each quantity in the cart and after reload. Watch Network for failures and unexpected cart writes.
2. Idle collection: confirm cart reads do not continuously repeat because of self-triggered DOM updates.
3. Option products: no weight/meal count selected, valid selection, changed selection and reload. Confirm prompts, disabled behavior and the correct variant.
4. PDP: select meal count while preference is unselected; expect “Select meal preference”. Select a valid preference and verify price, availability and submitted variant. Repeat after changing meal count.
5. Cart: test rapid +/−, typed quantity, removal, properties, split lines and subscription versus one-time lines. Navigate to cart/checkout while saving and confirm edits persist.
6. Box popup: open, close, No swaps and Save swaps. Check cancellation, successful addition, swap text and notes.
7. PDP: main and sticky Add to cart confirmation, network failure and sold-out cases.
8. Delivery: approved postcode/date selection, checkout availability and applicable shipping totals. Do not place an order without approved test details and payment arrangements.
9. Repeat relevant flows on desktop and a mobile viewport. Label viewport emulation accurately; it is not real iPhone/Android testing.

Preserve existing customer cart items. Remove only test-created items and notes after testing.

## Diagnostics and evidence

Append `joy_cart_debug=1` to a test URL to enable `snippets/cart-request-debug.liquid`. It records recognized cart request timing/status, caller stacks and selected GraphQL operation names in the console. Logging is gated by the URL; request bodies, tokens and customer data are excluded by the implementation.

Save reproduction steps, sanitized screenshots and request evidence with the tested commit/theme ID. Dated reports in `docs/` describe historical checks, not a permanent guarantee that a current deployment is healthy.

## Deployment and rollback

1. Fetch current `main` and inspect its relationship to the working branch. Review the exact changed files.
2. Use a feature branch and duplicate unpublished theme for development. Confirm Shopify's GitHub branch-to-theme connection before any push.
3. Validate the change and complete relevant browser checks. Stage explicit paths only; unrelated screenshots and reports may already be staged.
4. Submit a focused PR describing behavior, validation and any remaining limitations. Merge/publish only within the approved scope. Weeknight Dinner Box publication requires Zahn approval as recorded in its setup document.
5. After merge, verify the remote commit, Shopify synchronization and served storefront behavior. A Git push is not evidence that the browser has received the update.
6. For rollback, revert the specific change through the normal review/deployment process, or use an approved known-good theme. Avoid force-pushing or resetting shared history.

## Verification limits at handover

This documentation does not certify a fresh end-to-end test. Exact customer incident attribution requires session/device evidence. Completed paid orders, real-phone behavior, subscription renewals and label/pick-list output require their own verification. Do not report these as passed based on local tests or older reports.
