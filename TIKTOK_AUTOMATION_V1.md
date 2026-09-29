# Tiotrack — TikTok Automation + Workspace Credentials V1

Este patch parte do TikTok Sender V1 que já foi validado com `code: 0 / message: OK`.

## O que muda

1. `getTikTokCredentials(workspaceId)` procura primeiro em `tiktok_integrations`.
2. Se ainda não houver integração salva, continua usando:
   - `TIKTOK_PIXEL_CODE`
   - `TIKTOK_EVENTS_ACCESS_TOKEN`
3. Adiciona rota segura para worker/cron:
   - `/api/cron/signals/tiktok`
4. Adiciona SQL da tabela `tiktok_integrations`.

## Aplicar

Na raiz do projeto:

```bash
unzip -o ~/Downloads/tiotrack-auto-tiktok-v1.zip -d .
npm run build
```

Depois rode no Supabase SQL Editor:

`supabase/migrations/202609290003_tiktok_integrations.sql`

## ENV nova para automação

Crie na Vercel:

`CRON_SECRET=<segredo-forte-e-aleatorio>`

Não remova ainda:
- `TIKTOK_PIXEL_CODE`
- `TIKTOK_EVENTS_ACCESS_TOKEN`

Eles continuam como fallback até cadastrarmos o Pixel/Token pela tela do Tiotrack.

## Deploy

```bash
git add .
git commit -m "feat: automate tiktok signal sender"
git push
vercel --prod
```

## Testar o worker

```bash
curl -s \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://tiotrack.vercel.app/api/cron/signals/tiktok" \
  | python3 -m json.tool
```

Se não houver fila pendente, o esperado é `processed: 0`.

## Vercel Cron

Depois de validar a rota, configure um Cron Job na Vercel para chamar:

`/api/cron/signals/tiktok`

Cadência inicial recomendada para o MVP: a cada 5 minutos.

O Vercel Cron envia `Authorization: Bearer <CRON_SECRET>` quando `CRON_SECRET` está configurado no projeto.

## Próxima etapa

Criar `Integrações → TikTok` no painel, com:
- nome
- Pixel ID
- token
- status
- botão Testar conexão
- Salvar

O backend salvará o token com AES-256-GCM usando:
`TIKTOK_INTEGRATION_ENCRYPTION_KEY`

O sender já está preparado para ler esse token por workspace.
