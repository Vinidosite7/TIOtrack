# Tiotrack Tracker V2 — Presell Identity + Outbound Decoration

Patch focused on presell/landing pages.

## Event ownership

When the page uses `tiotrack.js` in `presell` mode:

- `page_view`: Tiotrack page/browser
- `outbound_click`: Tiotrack page/browser
- `user_joined`: SharkBot webhook
- `payment_created`: SharkBot webhook
- `payment_approved`: SharkBot webhook -> canonical Purchase

This prevents the same PageView/Purchase from being created by two independent sources.

## What changed

### `public/tiotrack.js`

- first-party `visitor_id`, `session_id`, `lead_id`, `click_id`
- persists first-touch and last-touch attribution
- captures UTMs and click IDs (`ttclid`, `fbclid`, `gclid`, `kwclid`, etc.)
- preserves Shark-related parameters used by existing funnels
- automatically decorates Shark outbound links before interaction
- recognized Shark links include `serverflow.dad` and links carrying `shk`
- outbound Shark URL receives deterministic `click_id=<Tiotrack click id>`
- preserves destination query params instead of replacing them
- works with dynamically inserted buttons using `MutationObserver`
- handles middle-click/new-tab better because the href is decorated before the click
- singleton per workspace to avoid duplicate PageViews if the script is injected twice
- supports SPA navigation without sending duplicate PageViews for the same URL

### `src/lib/tracking/core.ts`

Important correction: Tiotrack internal `click_id` is no longer treated as a Kwai click id.
Kwai detection now uses `kwclid` / `kwai_click_id` or the traffic source.

### `src/app/api/traffic/collect/route.ts`

Reads extra click identifiers preserved by Tracker V2 from metadata and feeds them to canonical attribution without requiring a DB schema change.

## Default script

```html
<script
  async
  src="https://tiotrack.vercel.app/tiotrack.js"
  data-workspace="WORKSPACE_UUID"
  data-mode="presell"
></script>
```

For Tiotrack Pages the Worker can keep injecting the script automatically.

Optional attributes:

```html
data-product="PRODUCT_UUID"
data-funnel="FUNNEL_UUID"
data-step="presell"
data-outbound-domains="serverflow.dad,outro-dominio.com"
data-click-param="click_id"
data-auto-decorate="true"
data-pageview="true"
data-spa="true"
```

## Explicit outbound links

Any link can be forced into decoration:

```html
<a href="https://example.com/checkout" data-tio-outbound>Comprar</a>
```

To opt out:

```html
<a href="https://serverflow.dad/l/..." data-tio-no-decorate>...</a>
```

## Browser debug

After loading a presell:

```js
TioTrack.clickId
TioTrack.sessionId
TioTrack.decorate('https://serverflow.dad/l/abc?shk=xyz')
```

Expected decorated link contains at minimum:

```text
click_id=tio_...
```

and, when present on the incoming traffic, `ttclid` and UTMs.

## Shark contract already validated

Current SharkBot tests showed:

```text
URL click_id=CLICK_222
-> Shark webhook data.tracking.kwclid=CLICK_222
```

So the Tiotrack internal `click_id` is intentionally exported as the outbound `click_id` for Shark correlation.
