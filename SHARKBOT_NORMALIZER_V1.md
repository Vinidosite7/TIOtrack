# Tiotrack — SharkBot Normalizer V1

Transforma o webhook bruto da Shark em eventos canônicos do Tiotrack.

## Eventos suportados

- `user_joined` → `tracking_leads` + `tracking_events.event_name = lead`
- `payment_created` → `orders.status = waiting_payment` + `tracking_events.event_name = payment_created`
- `payment_approved` → mesma order vira `paid` + `tracking_events.event_name = purchase`

## Atribuição

Quando `data.tracking.kwclid` contém um `tio_...`, o normalizador usa isso como o `click_id` determinístico do Tiotrack e tenta recuperar:

- visitor_id
- session_id
- produto
- funil
- UTMs
- ttclid/fbclid/gclid
- landing URL

Se produto/funil ainda não estiverem gravados na sessão, ele tenta inferir pelo domínio/rota/Page usada na landing.

## Deduplicação

Eventos canônicos usam chave estável por workspace + evento Shark + entidade.

Reenvios de webhook não duplicam:
- lead
- payment_created
- purchase
- order

A order usa a unique key existente:
`workspace_id + provider + external_id`.

## Signal Engine

Quando chega `payment_approved`, o Purchase é colocado em `signal_outbox` somente para os destinos configurados no funil (`tracking.destinations`).

Isto ainda NÃO envia para TikTok/Meta/Kwai/Google; apenas deixa a fila pronta para o sender/API que virá no próximo passo.

## Segurança operacional

O endpoint continua "capture-first":
1. salva payload bruto;
2. responde com sucesso mesmo se a normalização falhar depois;
3. evita que a Shark desative o webhook após falhas downstream.

O token atual continua sendo usado. HMAC-SHA256 pode ser adicionado quando confirmarmos o header/segredo exato exposto pela Shark.

## Aplicar

Na raiz do projeto:

```bash
unzip -o ~/Downloads/tiotrack-sharkbot-normalizer-v1.zip -d .
npm run build
vercel --prod
```

Nenhum SQL novo é necessário se você já rodou `tiotrack-v8-setup-repair.sql` e o SQL de captura SharkBot.

## Teste

Depois do deploy, gere um PIX de teste pelo funil e consulte o webhook. A resposta do POST agora inclui:

- `normalized`
- `canonical_event`
- `canonical_event_id`
- `order_record_id`
- `signal_destinations`

No Supabase, confira:
- `tracking_leads`
- `orders`
- `tracking_events`
- `signal_outbox`
