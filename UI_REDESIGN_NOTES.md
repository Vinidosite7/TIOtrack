# Tiotrack — Hawk UI (v4)

Todas as páginas no padrão Hawk: navy profundo, painéis ardósia, acento lavanda, Inter, top nav.

## Kit compartilhado
- `components/hawk/ui.tsx` — KpiCard, TrafficPulseCard, Gauge, MeterRow, WorldMap, BarRow, StatusPill, MiniStat, Toggle, Pager, PageHeader, PeriodSegment, RefreshBtn
- `components/hawk/charts.tsx` — HawkBars (barras gradiente com raio adaptativo), SeriesLegend (séries clicáveis), dayBuckets

## Páginas
- **Visão geral** — tráfego ao vivo + 5 KPIs com Δ%, desempenho por tempo, produto + mapa, logs (bots x real)
- **Campanhas** — tabela Hawk, ordenação, seleção com soma
- **Vendas** — 5 KPIs com Δ% (receita, PIX, ticket, conversão de PIX, reembolso/CB), caixa por tempo, receita por origem/plataforma, abas por status com contagem, paginação, CSV (separador `;`, abre certo no Excel BR)
- **Funil & UTMs** — funil real por sessão (visitantes → engajados → checkout → compraram), quebra por origem/campanha/meio/criativo com sessões, checkout, conv. e R$/sessão; qualidade da atribuição; top R$/sessão
- **Tráfego** — visão geral (requisições por hora, mapa, motivos de bloqueio), ao vivo (pausar/retomar, filtro), regras (chips de país + código livre, sliders de risco, UAs como tags), segurança (distribuição de risco, top motivos/IPs, camadas), domínios (validação, remover, snippets com copiar), logs (detalhe expandível, filtros, CSV)
- **Signal** — saúde do sinal, entrega TikTok, cobertura ttclid/fbclid/gclid/sessão, dados do cliente, últimas entregas
- **Relatórios** — DRE diário (7/14/30/90d), gráfico com abas, melhor/pior dia, composição da receita, tabela por dia, diário da operação, CSV
- **Integrações** — mesmos handlers; botão "Conectar com Facebook" (OAuth que já existia no código) + token de sistema
- **Configurações** — abas Perfil/Workspace/Alertas/Segurança; webhook usa o domínio atual; preferências de alerta salvas por workspace no aparelho
- **Login** — novo visual

## Bugs corrigidos no caminho
- Simulador de regras mandava `device_type`/`user_agent`, mas o engine lê `deviceType`/`userAgent` → sempre dava "dispositivo unknown". Corrigido.
- Funil podia passar de 100% com vendas sem sessão rastreada — agora só conta venda casada com sessão (o total aparece no rodapé).
- Fonte: `var(--font-inter, Inter)` com fallback, pra nunca cair em serifada.
- `tsconfig.json` exclui `workers/` (quebrava `next build`).
