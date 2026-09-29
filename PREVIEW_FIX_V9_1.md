# Tiotrack v9.1 — Preview Fix

Corrige o preview de Tiotrack Pages que abria o HTML como texto.

## Causa
O preview apontava direto para o objeto público do Supabase Storage. Dependendo dos headers/metadados retornados pelo Storage/navegador, o HTML podia ser tratado como texto em vez de documento HTML.

## Correção
- Novo proxy de preview: `/api/pages/:id/preview/...`
- O servidor baixa o arquivo do bucket e responde com o MIME correto.
- HTML usa `text/html; charset=utf-8`.
- CSS/JS/imagens/fontes usam seus Content-Types corretos.
- URLs relativas continuam funcionando via `<base>`.
- URLs comuns iniciadas por `/` em `src`, `href`, `poster` e `srcset` são ajustadas para o caminho de preview.
- O preview sempre usa o deployment atualmente ativo, então rollback aparece imediatamente.

Não exige migration SQL nova.
