# Order failure investigation — 21 October 2026

Status: investigation incomplete; customer incident cause not confirmed. No storefront code or app settings changed.

## Evidence collected

### Microsoft Clarity access

Clarity sign-in succeeded, but the account's Projects page showed only Nutrionics projects. An unsaved Add new project form for Joy was visible. No project was created. Creating a new project cannot provide historical recordings.

Blocked: Joy's existing project link/access is needed before reviewing the last 14 days of Dead clicks, Rage clicks, JavaScript errors, short sessions, and mobile product/cart recordings. No customer recordings have been reviewed and no recording links are available yet.

Follow-up: the actual rendered storefront contains `https://www.clarity.ms/tag/sp9mw3qhk6?ref=shopify`. Opening the matching project at `https://clarity.microsoft.com/projects/view/sp9mw3qhk6/dashboard` returned “This project doesn't exist or you don't have permissions to view it.” The installed project ID has therefore been located without requiring the user to find it. The existing signed-in account cannot read it.

The client ClickUp task was also read directly: it currently has creation/priority activity but no customer attempt dates/times or recording links. Its description explicitly says the client will send those later. Successful historical Shopify orders would not establish the time of a failed pre-checkout attempt.

### Reproduced code defect: error response becomes silent JavaScript exception

File: `assets/product-form.js`, around lines 217–218.

The response handler evaluates `response.url.includes('selling_plan=')` before checking `response.status`. The local current configuration has a nonempty upsellPage. The catch block only logs the exception.

An isolated execution of the actual response-handler body with a representative Shopify 422 response (`status: 422`, description, no url) produced:

```text
TypeError: Cannot read properties of undefined (reading 'includes')
Visible error handler reached: false
```

This demonstrates a real failure of error reporting in that handler. It could make an inventory/quantity rejection appear to do nothing. It does not prove that an old cart caused the rejection, that affected customers used this handler, or that this explains the five reports. The current PDP uses a separate direct-cart handler; applicability to the customers' entry path must be established from recordings.

Confidence: high in the isolated code defect; low in it being the reported incident's cause.

Compared the three cart handler files against fetched `origin/main` (`50529ad`); no differences were present. This is Git-connected main evidence, not proof of which theme version each historical session ran.

### Joy Subscriptions alert

Shopify Admin has a “Joy Subscription App is not working properly” alert. Its timestamp is `2026-08-03T04:32:18Z`, outside the requested recent window. It is historical evidence only and does not establish a current outage.

The installed-apps list includes Bird Pickup Delivery, Joy Subscription App and Simple Bundles & Kits. Presence of Simple Bundles does not establish that its storefront code is active or that it caused the incident. Joy's embedded dashboard remained blank during this inspection, so its internal diagnostic logs were not reached; this observation alone is not evidence of a customer-facing outage.

## Not yet verified

- The last 14 days of Clarity recordings and named customer sessions.
- Exact failed attempt dates/times and timezones for Danielle Black and Tracy Brunetti.
- Real iPhone/Android, returning-customer login and private-window behaviour. Available browser automation is not a real-phone test service.
- An old saved cart containing removed/changed products. No actual affected cart has been identified or reproduced.
- Current Joy and Bird/Simple On-Time Delivery internal error logs.

Previously completed normal desktop load/cart/checkout checks were not repeated as evidence for this incident.

## Next evidence required

1. Access to Joy's existing Clarity project.
2. Customer attempt dates/times, timezone, device/browser and URL if available.
3. A real device session or device-testing service and an authorized returning test account.
4. Current app error logs/support diagnostics, correlated with the failed attempts.

Do not report the incident fixed or assign the root cause before this evidence is available.
