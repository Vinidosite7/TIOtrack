# TioTrack

Central de performance com atribuição, vendas, integrações e o primeiro MVP do **Traffic Center**.

## Traffic Center incluído nesta versão

- `/traffic` — visão geral + KPIs + tráfego recente
- `/traffic/live` — stream em tempo real via Supabase Realtime
- `/traffic/rules` — país, device, OS, ação de bloqueio/challenge/redirect e simulador
- `/traffic/security` — visão da camada anti-bot / risk engine
- `/traffic/domains` — domínios + snippet de instalação
- `/traffic/logs` — logs pesquisáveis
- `/signal` — esqueleto inicial do Signal Center
- `public/tiotrack.js` — visitor/session/click ID + UTMs + click IDs + PageView
- `/api/traffic/collect` — coletor público server-side com enriquecimento de UA/device/OS e decisão de regra
- `src/lib/traffic/rule-engine.ts` — engine de ALLOW / CHALLENGE / BLOCK
- `workers/traffic-edge` — starter de Cloudflare Worker para bloquear **antes** da presell

## Banco

Antes de abrir o Traffic Center, aplique:

```text
supabase/migrations/202609270001_traffic_center.sql
```

A migration cria `traffic_rules`, `traffic_domains`, `traffic_events`, índices, RLS e adiciona os IDs de tracking nas tabelas existentes.

## Instalação do tracker

O próprio painel em **Traffic Center → Domínios** gera o snippet. Formato:

```html
<script async src="https://SEU-TIOTRACK.com/tiotrack.js" data-workspace="WORKSPACE_UUID"></script>
```

Para propagar o `click_id` em um CTA (ex.: SharkBot usando `sck`):

```html
<a
  href="https://seu-link-do-bot"
  data-tio-event="telegram_click"
  data-tio-propagate="sck"
>Continuar no Telegram</a>
```

O script acrescenta `sck=tio_...` ao link e o webhook Shark já tenta casar `sck`, `click_id`, `tio_click_id` ou `xcod` com a conversão.

## Ambiente

Copie `.env.example` e preencha as chaves do Supabase, Meta, VAPID e webhook.

## Rodar

```bash
npm install
npm run dev
```

## Traffic Edge

`workers/traffic-edge` é o primeiro starter para Cloudflare. No MVP as regras do Worker vêm de `TRAFFIC_RULE_JSON`. Próxima etapa: sincronizar as regras do dashboard para KV/Config, adicionar rate limiting distribuído, reputação de ASN/IP e challenge.

A camada de Traffic Center é destinada a segurança, anti-abuso, disponibilidade regional e observabilidade; não há lógica de detecção de revisores de plataformas de anúncios.

## Sincronização automática das Traffic Rules para Cloudflare KV

A tela **Tráfego → Regras** agora salva a regra pelo backend do Tiotrack e tenta sincronizá-la automaticamente para um namespace Workers KV. Isso elimina a necessidade de editar `TRAFFIC_RULE_JSON` a cada mudança.

Configure no ambiente do Tiotrack:

```text
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_TRAFFIC_KV_NAMESPACE_ID=
EDGE_LOG_SECRET=
```

O token Cloudflare precisa de permissão **Workers KV Storage Write**. O backend usa a rota atual da API Cloudflare em `/accounts/{account_id}/storage/kv/namespaces/...`.

No Worker, configure o binding `TRAFFIC_RULES` e use o mesmo `EDGE_LOG_SECRET`. Consulte `workers/traffic-edge/README.md`.

Ao salvar uma regra:

```text
Dashboard → API do Tiotrack → Supabase → Cloudflare KV → Traffic Edge
```

A chave usada no KV é `rule:<workspace_id>`. Como Workers KV é eventualmente consistente, mudanças podem levar alguns segundos e, em outras regiões, até cerca de 60 segundos para propagar.

## Tracking Core V2 / Products

The current core adds a normalized Product/Funnel model inspired by common attribution architectures:

- `/produtos` — product/funnel list
- `/produtos/novo` — 4-step wizard (Product/Funnel -> Integration -> Tracking -> Review)
- `/api/products` — list/create products and default funnel steps
- `/api/products/[id]` — read/update a product
- `public/tiotrack.js` — persistent `visitor_id`, `lead_id`, `session_id`, `click_id`, SPA navigation tracking and optional product/funnel context
- `/api/conversions/ingest` — normalized server conversion/order ingestion with idempotency and signal outbox queueing

See `docs/XTRACKY_BLUEPRINT.md` for the architectural notes extracted from the supplied reference documentation.

## v9 — Pages + Domains

Esta versão adiciona a primeira camada operacional de hospedagem/infra dentro do Tiotrack:

- `/pages`: Pages estáticas com upload ZIP, deploys e rollback;
- `/domains`: hostname → Page/URL externa → regra de tráfego;
- Cloudflare for SaaS opcional para Custom Hostnames/SSL;
- Traffic Edge multi-tenant por hostname/path;
- Produtos agora podem selecionar uma Tiotrack Page diretamente no wizard.

Veja `docs/PAGES_DOMAINS_V9.md` para setup.
