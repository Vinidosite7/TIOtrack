# TioTrack Traffic Edge — setup de produção

Este é o primeiro setup real para colocar o Traffic Center na frente de uma presell.

## 1. Criar o namespace Workers KV

No diretório `workers/traffic-edge`:

```bash
npx wrangler login
npx wrangler kv namespace create TRAFFIC_RULES
```

Copie o `id` retornado. O binding usado pelo Worker precisa se chamar exatamente `TRAFFIC_RULES`.

## 2. Criar o arquivo de configuração

Copie:

```bash
cp wrangler.jsonc.example wrangler.jsonc
```

Edite:

- `kv_namespaces[0].id`
- `ORIGIN_URL`
- `WORKSPACE_ID`
- `COLLECTOR_URL`

`ORIGIN_URL` deve ser a origem real da presell, por exemplo um domínio Vercel diferente do hostname público interceptado pelo Worker. Evite apontar `ORIGIN_URL` para o próprio hostname do Worker para não criar loop.

## 3. Secret do Worker

Gere um valor longo e aleatório e use o MESMO valor no Worker e no ambiente do Tiotrack/Vercel.

No Worker:

```bash
npx wrangler secret put EDGE_LOG_SECRET
```

No Tiotrack/Vercel:

```text
EDGE_LOG_SECRET=<mesmo valor>
```

## 4. Variáveis do app Tiotrack/Vercel

Configure no projeto Tiotrack:

```text
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_TRAFFIC_KV_NAMESPACE_ID=
EDGE_LOG_SECRET=
```

O `CLOUDFLARE_API_TOKEN` precisa conseguir gravar no Workers KV. Restrinja o token à conta usada pelo Tiotrack sempre que possível.

## 5. Deploy inicial do Worker

```bash
npx wrangler deploy
```

Antes de mexer no domínio real, teste pelo `workers.dev` gerado no deploy:

```text
https://SEU-WORKER.SEUSUBDOMINIO.workers.dev/.well-known/tiotrack-edge
```

Resposta esperada:

```json
{
  "ok": true,
  "service": "tiotrack-traffic-edge",
  "workspace_id": "...",
  "rule_source": "kv"
}
```

Se `rule_source` aparecer como `env` ou `disabled`, salve/sincronize a regra no painel do Tiotrack primeiro.

## 6. Sincronizar a primeira regra

No painel:

`Tráfego → Regras de tráfego → Salvar regra`

O backend grava no Supabase e envia para a chave:

```text
rule:<workspace_uuid>
```

no Workers KV.

Também existe o endpoint autenticado:

```text
GET /api/traffic/edge/status?workspace_id=<uuid>
```

para conferir se a regra realmente existe no KV.

## 7. Testar antes do domínio de produção

Exemplo da primeira regra:

- País: BR
- Device: mobile
- SO: iOS + Android
- deny_action: block

Teste o endpoint do Worker com navegador mobile/desktop. O Worker devolve cabeçalhos úteis:

```text
X-TioTrack-Decision
X-TioTrack-Rule-Source
X-TioTrack-Rule-Version
```

E o endpoint de health:

```text
/.well-known/tiotrack-edge
```

## 8. Ligar o domínio

Para presell hospedada fora do Cloudflare, use uma **Worker Route** sobre o hostname público, mantendo `ORIGIN_URL` apontando para a origem externa.

Exemplo no `wrangler.jsonc`:

```jsonc
"routes": [
  {
    "pattern": "oferta.seudominio.com/*",
    "zone_name": "seudominio.com"
  }
]
```

Depois:

```bash
npx wrangler deploy
```

A zona precisa estar no Cloudflare e o hostname deve estar configurado de forma compatível com Workers Routes.

## 9. Primeiro teste real

Abra:

```text
https://oferta.seudominio.com/?utm_source=tiktok&utm_campaign=edge_test&ttclid=teste123
```

Valide:

1. a página abre quando a regra dá `ALLOW`;
2. `/.well-known/tiotrack-edge` mostra `rule_source: kv`;
3. o response header mostra `X-TioTrack-Decision: allow`;
4. a entrada aparece em `Tráfego → Live` e `Logs`;
5. ao mudar a regra no painel, a nova versão aparece no KV e no health endpoint após a propagação.

## Observação sobre cache/propagação

O Worker usa cache do KV para reduzir leituras. O TTL mínimo usado aqui é 30 segundos. Workers KV é distribuído globalmente e alterações não são necessariamente instantâneas em todos os pontos de presença.
