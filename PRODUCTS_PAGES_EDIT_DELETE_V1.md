# Tiotrack — Products + Pages Edit/Delete V1

## O que corrige
- Produto agora pode trocar a presell (Tiotrack Page ou URL externa).
- Ao trocar a presell, atualiza:
  - `funnels.config.entry`
  - `funnel_steps.page_id` das etapas web
- Recarregamento usa `cache: no-store`, evitando mostrar configuração antiga.
- Produto pode editar nome, preço, status e destinos de Signal.
- Produto pode ser excluído pelo card ou pela tela do produto.
- Pages ganham Editar e Excluir nos cards e na tela da Page.
- Page pode editar nome/status sem mudar o slug.
- Ao excluir uma Page:
  - arquivos/deploys são removidos;
  - rotas ligadas à Page são desativadas;
  - `funnels.config.entry.page_id` é limpo quando necessário;
  - domínios afetados são sincronizados novamente para o Edge.

## Aplicar
Na raiz do projeto:

```bash
unzip -o ~/Downloads/tiotrack-products-pages-edit-delete-v1.zip -d .
npm run build
vercel --prod
```

Nenhum SQL novo é necessário.
