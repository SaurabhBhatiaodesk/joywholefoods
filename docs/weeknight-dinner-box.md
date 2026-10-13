# Weeknight Dinner Box setup and testing

## Deployment

Upload these changes only to a duplicate, unpublished Joy Wholefoods theme.
Do not publish before Zahn approves. A Git push can deploy a connected theme;
check that the destination is the duplicate before pushing this change.

## 1. Create custom data definitions

In Settings > Custom data, create a merchant-owned metaobject definition
named Product group (type `product_group`). Enable storefront read access.

| Field key | Type |
| --- | --- |
| products | List of product references |
| meals_values | List of single line text |
| diet_values | List of single line text |

Create product metafield definitions:

| Namespace and key | Type |
| --- | --- |
| custom.product_group | Metaobject reference, restricted to Product group |
| custom.option_meals | Single line text |
| custom.option_diet | Single line text |
| custom.hide_from_listings | Boolean |

Make these definitions readable by the storefront.

## 2. Populate the products and group

Use the six existing Meal Kit Box products. Copy the Meal Kit Subscription
product's images, description, Meal Kit product type, template, and subscription
selling plan associations to each. Kristen supplies final copy, photos, and prices.
Do not change Joy bundles: Kristen links each product to its corresponding bundle.

Create the Weeknight Dinner Box metaobject entry:

- products: all six products
- meals_values: `3 Meals`, `5 Meals`, in that order
- diet_values: `Vegetarian`, `Mixed`, `Meat`, in that order

If the definition supports draft/active status, make the entry active.
Set each product's `custom.product_group` to this entry, then set:

| Combination | option_meals | option_diet | hide_from_listings | seo.hidden |
| --- | --- | --- | --- | --- |
| 3 meals, Vegetarian | 3 Meals | Vegetarian | true | 1 |
| 3 meals, Mixed | 3 Meals | Mixed | false | unset |
| 3 meals, Meat | 3 Meals | Meat | true | 1 |
| 5 meals, Vegetarian | 5 Meals | Vegetarian | true | 1 |
| 5 meals, Mixed | 5 Meals | Mixed | true | 1 |
| 5 meals, Meat | 5 Meals | Meat | true | 1 |

Use an integer product metafield `seo.hidden` with value `1` for the five
non-default products. This excludes them from Shopify search and the sitemap;
the theme's boolean filter alone only prevents rendering.

Products must be active and published to the Online Store to resolve as product
references and open their pages. Arrange product visibility only when ready:
draft products cannot be tested as normal storefront links.

## 3. Preview and test

Ensure the assigned product template has a variant picker block. The shared
picker renders meal/diet links for grouped products, including single-variant
products, and retains the original picker for all other products.

1. Open the duplicate theme preview on the default product. Expect two meal
   options and three diet options, with 3 Meals and Mixed selected.
2. Start on each of the six product pages. Change meals: diet must remain the
   same. Change diet: meals must remain the same. Check all targets and active
   states. Missing/unpublished targets are omitted, never rendered as empty links.
3. Make one combination unavailable temporarily. Its link must be grey and
   struck through, remain clickable, and announce Sold out to screen readers.
4. Check collection grids, featured collections, recommendations, upsells,
   search, and predictive search. Only the default may appear. The collection
   pagination/count can still include hidden products; remove the five siblings
   from merchandising collections if full pages and exact counts are required.
5. On every product, confirm the correct subscription selling plans and add
   the correct variant to cart. Confirm checkout. Test a subscription purchase
   on at least one combination after Kristen has linked the Joy bundles.
6. Use an authorized test checkout to verify each combination's bundle
   components. Verify Box Label output and the pick list for one test order.
7. If a reviews app is installed, group reviews across these products through
   that app, or tell Zahn if the app does not support this.
8. Repeat on mobile and desktop, using keyboard navigation too. Check an
   unrelated ordinary product still has its original variant picker and cart.

The links deliberately navigate to each product so its subscription app and
product form initialize normally. The optional in-place section swapping is
not implemented. No live storefront, bundle configuration, or weekly menu
has been changed by the local theme implementation.

## Local validation

- Shopify Liquid parser: all 19 changed/new Liquid files parsed successfully.
- Translation JSON and `git diff --check`: passed.
- Shopify theme validator: new group snippet, shared picker, product cards,
  search, predictive search, and recommendation changes passed error checks.
- The complete changed-file check reported 23 errors in existing code:
  blocking external scripts, missing schema translation keys, and missing
  `quick-add-bulk.js`. Every reported error line was checked against HEAD
  and exists unchanged there. These unrelated errors remain unresolved.
- Storefront behavior, subscription purchases, checkout, Joy components,
  and Box Label output require the preview deployment and store setup.

Target supplied by the user: preview theme `186455818455` at
https://joywholefoods.com.au/?preview_theme_id=186455818455.
The Shopify connection requires reauthentication to the Joy Wholefoods store.
