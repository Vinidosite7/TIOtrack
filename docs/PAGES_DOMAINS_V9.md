# TioTrack v9 — Pages + Domains

## O que entrou

- **Pages**: upload de ZIP estático, deploy versionado, preview e rollback.
- **Domains**: hostname ligado a uma Tiotrack Page ou URL externa.
- **Routes**: destino + path + regra de tráfego + injeção automática do tracker.
- **Edge multi-tenant**: o Worker deixa de depender de `ORIGIN_URL`/`WORKSPACE_ID` fixos e consulta `domain:<hostname>` no KV.
- **Cloudflare for SaaS opcional**: se `CLOUDFLARE_SAAS_ZONE_ID` estiver configurado, o cadastro do domínio cria um Custom Hostname e o painel passa a mostrar validações DNS/SSL retornadas pela Cloudflare.

## SQL

Rode depois das migrations anteriores:

`supabase/migrations/202609280004_pages_domains_v9.sql`

## Variáveis novas no Tiotrack/Vercel

```env
CLOUDFLARE_SAAS_ZONE_ID=
TIO_EDGE_CNAME_TARGET=
```

Continuam necessárias para o KV:

```env
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_TRAFFIC_KV_NAMESPACE_ID=
EDGE_LOG_SECRET=
```

## Worker

No Worker, o `wrangler.jsonc` pode ficar sem `ORIGIN_URL` e `WORKSPACE_ID`:

```jsonc
"vars": {
  "COLLECTOR_URL": "https://SEU-TIOTRACK.com/api/traffic/collect",
  "TRACKER_URL": "https://SEU-TIOTRACK.com/tiotrack.js",
  "RULE_CACHE_TTL_SECONDS": "30"
}
```

O KV usa:

- `domain:<hostname>` → workspace + routes + origem/page ativa.
- `rule-id:<uuid>` → regra específica da rota.
- `rule:<workspace_id>` → fallback de regra do workspace.

## Pages

O ZIP deve conter `index.html`. Se vier dentro de uma única pasta raiz, o uploader remove essa pasta automaticamente. Limites MVP:

- ZIP: até 35 MB compactado.
- conteúdo extraído: até 80 MB.
- até 600 arquivos.
- compressão ZIP store/deflate.

Os arquivos são gravados em `tiotrack-pages`, separados por workspace/page/deployment. Cada novo upload cria outro deployment; rollback apenas muda `current_deployment_id`.

## Cloudflare for SaaS

Para o modo completo de domínios próprios, configure uma zona SaaS, fallback origin/Worker e Custom Hostnames na Cloudflare. O TioTrack usa a API de Custom Hostnames somente quando `CLOUDFLARE_SAAS_ZONE_ID` estiver presente. Sem isso, Pages e cadastro/roteamento continuam funcionando localmente, mas a ativação automática de DNS/SSL fica pendente.
