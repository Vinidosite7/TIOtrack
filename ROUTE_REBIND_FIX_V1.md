# Tiotrack Route Rebind Fix V1

Corrige o bug em que excluir/trocar uma Presell podia deixar a rota pública com:

- `enabled = false`
- `page_id = null`
- Edge/KV com `routes: []`
- site exibindo `Rota não encontrada`

## Novo comportamento

### Ao trocar a Presell no Produto
O Tiotrack agora:
1. atualiza `funnels.config.entry`;
2. atualiza `funnel_steps.page_id`;
3. religa a `traffic_route` à Page nova;
4. força `enabled=true`, `origin_type=page`, `inject_tracker=true`;
5. sincroniza o domínio no Cloudflare KV/Edge.

Há um modo de recuperação seguro para o estado quebrado atual:
- se não encontrar a rota antiga,
- e existir exatamente uma rota de Page órfã (`enabled=false`, `page_id=null`) no workspace,
- essa rota é religada automaticamente à Page escolhida.

### Ao excluir uma Page
Se ela ainda estiver ligada a Produto ou domínio, a API retorna HTTP 409 e NÃO quebra a rota.
Primeiro é necessário trocar a Presell no Produto.

## Aplicar

```bash
unzip -o ~/Downloads/tiotrack-route-rebind-fix-v1.zip -d .
npm run build
vercel --prod
```

Depois:
1. Produtos → Detox → Editar
2. selecione a Page `pags`
3. Salvar alterações

Esse save deve restaurar a rota e sincronizar o Edge automaticamente.
