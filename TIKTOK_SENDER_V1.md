# Tiotrack — TikTok Events API Sender V1

## O que faz

Processa `signal_outbox` com:

- `destination = tiktok`
- `event_name = purchase`
- `status = queued|retry`

E envia para TikTok Events API como `CompletePayment`.

## Credenciais V1 (teste rápido)

Na Vercel:

- `TIKTOK_PIXEL_CODE`
- `TIKTOK_EVENTS_ACCESS_TOKEN`

O código já isola isso em `getTikTokCredentials(workspaceId)`. Na V2 basta trocar essa função para ler `tiktok_integrations` por workspace.

## Instalação

Na raiz do Tiotrack:

```bash
unzip -o ~/Downloads/tiotrack-tiktok-sender-v1.zip -d .
npm run build
git add .
git commit -m "feat: tiktok events api sender v1"
git push
vercel --prod
```

## Teste rápido

Por enquanto o endpoint aceita `SIGNAL_WORKER_SECRET`, `CRON_SECRET` ou, como fallback temporário, `SHARKBOT_WEBHOOK_SECRET`.

```bash
curl -s -X POST \
  "$ORIGIN/api/signals/tiktok/process?token=$SHARKBOT_WEBHOOK_SECRET&wid=$WORKSPACE_ID&limit=5" \
  | python3 -m json.tool
```

Se quiser usar o Test Events do TikTok, acrescente:

```text
&test_event_code=SEU_CODIGO
```

## Depois confira

```sql
select
  id,
  destination,
  event_name,
  status,
  attempts,
  last_error,
  response,
  created_at,
  sent_at
from signal_outbox
order by created_at desc
limit 20;
```

Esperado no sucesso:

- `status = sent`
- `attempts = 1`
- `sent_at` preenchido
- `response` com HTTP/body retornado pelo TikTok

## Segurança antes de produção

1. Criar `SIGNAL_WORKER_SECRET` próprio.
2. Remover o fallback de `SHARKBOT_WEBHOOK_SECRET`.
3. Mover Pixel/token para `tiktok_integrations` criptografado por workspace.
4. Rodar o worker por cron/fila e não por endpoint manual.
