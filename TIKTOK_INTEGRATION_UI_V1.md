# Tiotrack — TikTok Integration UI V1

Adiciona ao painel:
- Integrações → TikTok Events API
- Pixel por workspace
- Access Token criptografado server-side
- fallback nas ENV existentes
- cron do TikTok a cada 5 minutos

## Antes do build

1. Rode no Supabase SQL Editor:
   `supabase/migrations/202609290003_tiktok_integrations.sql`

2. Gere uma chave AES-256:

```bash
openssl rand -base64 32
```

3. Na Vercel, crie:

`TIKTOK_INTEGRATION_ENCRYPTION_KEY=<resultado do comando>`

Não envie essa chave por chat e não a coloque em `NEXT_PUBLIC_*`.

4. Rotacione também o `CRON_SECRET` que foi usado nos testes e faça o cron usar o novo valor.

## Aplicar

```bash
unzip -o ~/Downloads/tiotrack-tiktok-integration-ui-v1.zip -d .
npm run build
git add .
git commit -m "feat: workspace tiktok events api integration"
git push
vercel --prod
```

## Depois do deploy

Abra `/integracoes`.

No card `TikTok Events API`, cadastre:
- Pixel ID
- Access Token
- Advertiser ID (opcional)

Ao salvar, o token é criptografado no servidor. O browser nunca recebe o token salvo de volta.

O sender procura primeiro a integração do workspace. Se existir, a resposta do signal_outbox passa a registrar:

`credential_source = workspace`

Se ainda não existir, continua:
`credential_source = env`

## Cron

`vercel.json` preserva o cron diário já existente e adiciona:

`/api/cron/signals/tiktok` → `*/5 * * * *`

Se seu plano da Vercel não aceitar a frequência de 5 minutos, remova apenas essa entrada e configure uma frequência suportada; o endpoint continua funcionando.
