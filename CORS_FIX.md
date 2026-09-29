# Tiotrack CORS fix v2

Corrige coleta browser -> `https://tiotrack.vercel.app/api/traffic/collect` em páginas servidas por domínio customizado.

- `tiotrack.js`: `sendBeacon` passa a ser usado apenas quando o endpoint é same-origin. Em custom domains usa `fetch(..., credentials: 'omit', keepalive: true)`.
- `/api/traffic/collect`: preflight/POST refletem o `Origin` recebido, com `Vary: Origin`, evitando `Access-Control-Allow-Origin: *` em requests credentialed.

Depois de aplicar:

```bash
npm run build
vercel --prod
```

Teste na presell e confirme que não há erro CORS no Console.
