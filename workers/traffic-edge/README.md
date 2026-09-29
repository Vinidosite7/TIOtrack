# TioTrack Traffic Edge v9

O Worker agora é multi-tenant. Ele resolve o hostname da requisição e busca no KV:

- `domain:<hostname>` — workspace, rotas e origem ativa;
- `rule-id:<uuid>` — regra específica da rota;
- `rule:<workspace_id>` — fallback da regra do workspace.

## Variáveis

```text
COLLECTOR_URL
TRACKER_URL
RULE_CACHE_TTL_SECONDS
```

Secret:

```bash
npx wrangler secret put EDGE_LOG_SECRET
```

`ORIGIN_URL` e `WORKSPACE_ID` continuam opcionais apenas para compatibilidade com o setup antigo.

## Health

Abra no hostname atendido pelo Worker:

```text
/.well-known/tiotrack-edge
```

A resposta mostra modo (`multi-tenant` ou `legacy`), domínio, workspace, rota e regra carregada.
