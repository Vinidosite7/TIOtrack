# Xtracky docs -> TioTrack implementation blueprint

This document records product/engineering patterns extracted from the supplied Xtracky documentation screenshots. It is not a copy of Xtracky code or proprietary implementation.

## Patterns worth keeping

- One product can represent multiple funnel/channel shapes (site, site -> bot, bot-only, WhatsApp, ecommerce, custom).
- Browser tracking needs persistent lead identity across pages and sessions, not only UTMs.
- Multi-step funnels should preserve click attribution as the user moves between domains/pages/channels.
- SPA navigation needs explicit page-view handling for history.pushState/replaceState/popstate.
- Payment webhooks must be idempotent and normalize provider statuses into canonical order/event statuses.
- Conversion ingestion should accept server-to-server API keys and deduplicate by external order/status.
- Tracking sources should resolve platform click IDs (ttclid/fbclid/gclid/click_id) and keep first-touch + last-touch.
- Integrations should be adapters around one canonical event/order schema rather than bespoke tables per checkout.
- Signal delivery should happen from an outbox with retries, independently of conversion ingestion.

## TioTrack mapping

Product -> `products`
Funnel -> `funnels`
Journey nodes -> `funnel_steps`
Persistent person -> `tracking_leads`
Browser/server canonical events -> `tracking_events`
Orders/payment lifecycle -> `orders`
Server integrations -> `api_keys` + `/api/conversions/ingest`
Ad-network delivery -> `signal_outbox`
Traffic/security telemetry -> `traffic_events`

## Identity hierarchy

- `visitor_id`: browser/device installation identity (localStorage)
- `lead_id`: persistent TioTrack lead identity (localStorage), survives new sessions
- `session_id`: tab/session identity (sessionStorage)
- `click_id`: paid-click journey identity (sessionStorage; propagated into Telegram/WhatsApp/checkout links)
- provider IDs: `ttclid`, `fbclid`, `gclid`

## Canonical initial events

- `page_view`
- `identify`
- `click`
- `telegram_start`
- `whatsapp_start`
- `initiate_checkout`
- `payment_created`
- `purchase`
- `refund`
- `chargeback`

The exact TikTok/Meta/Kwai/Google event names are mapped later in the signal dispatcher; the core remains network-agnostic.
