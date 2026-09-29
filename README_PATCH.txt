Tiotrack v9.1 - Cloudflare O2O / same-zone validation patch

Substitua no projeto os arquivos mantendo os caminhos:
- src/lib/traffic/cloudflare-saas.ts
- src/app/api/domains/[id]/verify/route.ts

Mudanças:
1) Novos Custom Hostnames usam SSL HTTP DCV (method=http, type=dv).
2) "Verificar agora" envia PATCH sem mudança para reiniciar a validação/DCV antes de consultar o status.

Depois reinicie: npm run dev
