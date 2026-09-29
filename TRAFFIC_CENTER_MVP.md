# Traffic Center MVP — o que já foi criado

## Funcional agora no código

1. **Dashboard `/traffic`**
   - ativos nos últimos 5 min
   - sessões 24h
   - permitidos / challenge / bloqueados
   - feed recente
   - origem do tráfego

2. **Ao vivo `/traffic/live`**
   - Supabase Realtime em `traffic_events`
   - país, device, origem, risco, motivo e decisão

3. **Rules `/traffic/rules`**
   - países
   - mobile / desktop / tablet
   - iOS / Android / Windows / macOS
   - block / challenge / redirect
   - thresholds de risk score
   - simulador antes de salvar

4. **Security `/traffic/security`**
   - estrutura anti-bot
   - User-Agent / HTTP clients
   - score de risco
   - roadmap ASN, datacenter, rate limit e browser challenge

5. **Domains `/traffic/domains`**
   - cadastro de domínio
   - snippet pronto do `tiotrack.js`
   - propagação de `click_id` por parâmetro, inclusive `sck` para o fluxo SharkBot

6. **Logs `/traffic/logs`**
   - request/session/click IDs
   - país/device/origem
   - risco e decisão
   - pesquisa local

7. **Tracker `public/tiotrack.js`**
   - `visitor_id`
   - `session_id`
   - `click_id`
   - UTMs
   - `fbclid`, `ttclid`, `gclid`
   - PageView
   - eventos customizados via `data-tio-event`
   - propagação de click ID via `data-tio-propagate`

8. **Collector `/api/traffic/collect`**
   - CORS
   - IP pelo servidor
   - User-Agent
   - país via Cloudflare/Vercel headers
   - device / OS / browser
   - Rule Engine
   - gravação de `traffic_events`
   - upsert em `sessions`

9. **SharkBot webhook melhorado**
   - captura `session_id`
   - tenta casar `tio_click_id`, `click_id`, `sck` ou `xcod`
   - grava `ttclid`, `fbclid`, `gclid`
   - marca sessão convertida
   - assinatura HMAC passa a ser obrigatória quando `SHARKBOT_WEBHOOK_SECRET` estiver configurado

10. **Traffic Edge starter**
    - `workers/traffic-edge`
    - GEO
    - device
    - User-Agent
    - ALLOW / BLOCK / REDIRECT / CHALLENGE placeholder
    - reverse proxy para a presell
    - logging para o Traffic Center

## Antes de testar

### 1. Banco

Aplique:

```text
supabase/migrations/202609270001_traffic_center.sql
```

### 2. Ambiente

Use `.env.example` como base.

### 3. Presell

Cole:

```html
<script async src="https://SEU-TIOTRACK.com/tiotrack.js" data-workspace="WORKSPACE_UUID"></script>
```

No botão do Telegram/Shark:

```html
<a
  href="LINK_DO_BOT"
  data-tio-event="telegram_click"
  data-tio-propagate="sck"
>
  Continuar
</a>
```

O destino vira aproximadamente:

```text
LINK_DO_BOT?sck=tio_xxxxx
```

Se a Shark devolver o `sck` dentro de `tracking`, o webhook já está preparado para gravar esse valor como `click_id`.

## O que ainda falta para produção

- sincronizar automaticamente `Traffic Rules -> Cloudflare KV/Worker`
- rate limiting distribuído
- IP/ASN reputation provider
- challenge real (ex.: Turnstile/WAF), não placeholder
- chave pública de coleta por domínio/workspace para reduzir spam no collector
- retenção/particionamento de `traffic_events` para alto volume
- Event Queue / retry
- TikTok Events API
- Meta CAPI
- Signal Health
- criptografia/vault para tokens de integrações existentes
- testes automatizados e build em CI
