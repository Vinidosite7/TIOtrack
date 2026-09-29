# TioTrack v10 — Live Traffic Logs

This patch activates accurate Edge → collector → Supabase → Realtime logging.

## What changed

- Traffic Edge now forwards the signed visitor context: visitor IP, country, region, city, ASN, user-agent, language, UTM parameters, click IDs, Cloudflare colo, route, domain and rule metadata.
- `/api/traffic/collect` trusts visitor context only for authenticated `edge_request` events using `EDGE_LOG_SECRET`.
- `/traffic/live` shows hostname + route and counts active visitors using session, then IP fallback.
- `/traffic/logs` shows hostname, route, rule, colo and IDs in the expandable request detail.
- Supabase Realtime publication is ensured idempotently.

## Required runtime configuration

The same secret must exist in both the TioTrack app and the Worker.

### TioTrack / Vercel

- `EDGE_LOG_SECRET=<same random secret>`
- Existing Supabase variables must remain configured, including `SUPABASE_SERVICE_ROLE_KEY`.

### Cloudflare Worker

- `COLLECTOR_URL=https://YOUR-TIOTRACK-DOMAIN/api/traffic/collect`
- `EDGE_LOG_SECRET=<same random secret>`

Generate a secret locally:

```bash
openssl rand -hex 32
```

Worker secrets:

```bash
cd ~/tiotrack/workers/traffic-edge
npx wrangler secret put EDGE_LOG_SECRET
npx wrangler secret put COLLECTOR_URL
npx wrangler deploy
```

For `COLLECTOR_URL`, paste the production TioTrack collector URL when Wrangler prompts.

## Realtime

Run `supabase/migrations/202609290001_traffic_live_realtime.sql` in the Supabase SQL Editor if the live page does not update automatically. It is safe to run more than once.

## Test

Open `/traffic/live` in TioTrack and then request the public test hostname from another tab/device.

```bash
curl -i 'https://teste.phamtolns.online/'
```

The request should appear in the live feed with the Edge decision, hostname, IP/country/device and rule metadata.
