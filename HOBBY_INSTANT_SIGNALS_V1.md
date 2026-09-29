# Tiotrack — Hobby Instant Signals V1

Corrige a limitação do Vercel Hobby sem atrasar o Purchase.

## Novo fluxo

payment_approved
→ normaliza Purchase
→ cria signal_outbox
→ tenta TikTok imediatamente
→ sent

Se TikTok falhar:
→ retry continua salvo na signal_outbox

O Vercel Cron passa a ser somente uma varredura de fallback diária, compatível com Hobby.

## Aplicar

```bash
unzip -o ~/Downloads/tiotrack-hobby-instant-signals-v1.zip -d .
npm run build
git add .
git commit -m "fix: instant tiktok dispatch on vercel hobby"
git push
vercel --prod
```

## Cron no Hobby

`vercel.json`:

- `/api/cron/daily-summary` — diário
- `/api/cron/signals/tiktok` — diário, como fallback

Não é mais necessário cron a cada 5 minutos para o caminho normal.

## Validação

No próximo `payment_approved`, a resposta do webhook terá:

```json
"signal_dispatch": {
  "attempted": true,
  "processed": 1,
  "sent": 1,
  "retry": 0,
  "failed": 0,
  "error": null
}
```

E o registro em `signal_outbox` deve chegar em `sent` sem chamada manual.
