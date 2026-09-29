'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleDollarSign, Receipt, Package, TrendingUp, Target, Plus, X, Trash2, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import { H, Panel, PanelHead, KpiCard, PageHeader, RefreshBtn, StatusPill, Empty, MiniStat, brl, num } from '@/components/hawk/ui'
import { HawkBars, SeriesLegend, type SeriesDef } from '@/components/hawk/charts'

type Period = '7d' | '14d' | '30d' | '90d'
const DAYS: Record<Period, number> = { '7d': 7, '14d': 14, '30d': 30, '90d': 90 }
type DaySummary = { id: string; dia: string; receita_bruta: number | null; gasto_ads: number | null; custo_produto: number | null; lucro_liquido: number | null; margem: number | null; roas: number | null; vendas_count: number | null }
type OpLog = { id: string; dia: string; titulo: string | null; conteudo: string; tipo: string | null; created_at: string }

const hoje = () => new Date().toISOString().split('T')[0]
const diasAtras = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0] }
const fmtDia = (s: string) => { const [, m, d] = s.split('-'); return `${d}/${m}` }
const fmtDiaLong = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
const TIPO: Record<string, { label: string; tone: 'lav' | 'neutral' | 'bad' | 'good' }> = {
  decisao: { label: 'Decisão', tone: 'lav' }, observacao: { label: 'Observação', tone: 'neutral' }, problema: { label: 'Problema', tone: 'bad' }, resultado: { label: 'Resultado', tone: 'good' },
}
type ChartTab = 'dre' | 'roas' | 'vendas'
const CHART_SERIES: Record<ChartTab, SeriesDef[]> = {
  dre: [{ key: 'receita', label: 'Receita', tone: 'light' }, { key: 'gasto', label: 'Gasto', tone: 'dim' }, { key: 'lucro', label: 'Lucro', tone: 'mid' }],
  roas: [{ key: 'roas', label: 'ROAS', tone: 'light' }],
  vendas: [{ key: 'vendas', label: 'Vendas', tone: 'light' }],
}

export default function RelatoriosPage() {
  const { active: workspace } = useWorkspaceStore()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<Period>('14d')
  const [summaries, setSummaries] = useState<DaySummary[]>([])
  const [logs, setLogs] = useState<OpLog[]>([])
  const [chartTab, setChartTab] = useState<ChartTab>('dre')
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ tipo: 'observacao', titulo: '', conteudo: '', dia: hoje() })
  const [savingLog, setSavingLog] = useState(false)

  const load = useCallback(async () => {
    if (!workspace?.id) return
    setLoading(true)
    const from = diasAtras(DAYS[period] - 1)
    const [sumRes, logRes] = await Promise.all([
      supabase.from('daily_summary').select('*').eq('workspace_id', workspace.id).gte('dia', from).lte('dia', hoje()).order('dia', { ascending: true }),
      supabase.from('operation_log').select('*').eq('workspace_id', workspace.id).gte('dia', from).order('dia', { ascending: false }).limit(50),
    ])
    setSummaries((sumRes.data as DaySummary[]) ?? [])
    setLogs((logRes.data as OpLog[]) ?? [])
    setLoading(false); setRefreshing(false)
  }, [workspace?.id, period])
  useEffect(() => { load() }, [load])

  const t = useMemo(() => {
    const s = (f: keyof DaySummary) => summaries.reduce((a, r) => a + Number(r[f] ?? 0), 0)
    const receita = s('receita_bruta'), gasto = s('gasto_ads'), custo = s('custo_produto'), lucro = s('lucro_liquido'), vendas = s('vendas_count')
    return { receita, gasto, custo, lucro, vendas, roas: gasto > 0 ? receita / gasto : 0, margem: receita > 0 ? (lucro / receita) * 100 : 0 }
  }, [summaries])

  const chart = useMemo(() => summaries.map(s => ({
    label: fmtDia(s.dia), receita: s.receita_bruta ?? 0, gasto: s.gasto_ads ?? 0, lucro: Math.max(0, s.lucro_liquido ?? 0), roas: s.roas ?? 0, vendas: s.vendas_count ?? 0,
  })), [summaries])

  const ranked = useMemo(() => [...summaries].sort((a, b) => (b.lucro_liquido ?? 0) - (a.lucro_liquido ?? 0)), [summaries])
  const best = ranked[0], worst = ranked[ranked.length - 1]
  const lossDays = summaries.filter(s => (s.lucro_liquido ?? 0) < 0).length

  async function saveLog() {
    if (!workspace?.id || !form.conteudo.trim()) return
    setSavingLog(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingLog(false); return }
    const { data } = await supabase.from('operation_log').insert({ workspace_id: workspace.id, user_id: user.id, dia: form.dia, titulo: form.titulo || null, conteudo: form.conteudo, tipo: form.tipo }).select('*').single()
    if (data) setLogs(l => [data as OpLog, ...l])
    setForm({ tipo: 'observacao', titulo: '', conteudo: '', dia: hoje() }); setShowForm(false); setSavingLog(false)
  }
  async function deleteLog(id: string) {
    if (!confirm('Apagar esta anotação?')) return
    await supabase.from('operation_log').delete().eq('id', id)
    setLogs(l => l.filter(x => x.id !== id))
  }
  function exportCSV() {
    const rows = [['Dia', 'Receita', 'Gasto', 'Custo produto', 'Lucro', 'Margem %', 'ROAS', 'Vendas'], ...summaries.map(s => [s.dia, s.receita_bruta ?? 0, s.gasto_ads ?? 0, s.custo_produto ?? 0, s.lucro_liquido ?? 0, s.receita_bruta ? (((s.lucro_liquido ?? 0) / s.receita_bruta) * 100).toFixed(1) : 0, (s.roas ?? 0).toFixed(2), s.vendas_count ?? 0])]
    const blob = new Blob(['﻿' + rows.map(r => r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `dre-${period}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const series = CHART_SERIES[chartTab]
  return (
    <div className="shell-page">
      <PageHeader title="Relatórios" sub={`DRE diário · ${summaries.length} dias com dados`}
        right={<>
          <div className="tt-segment">{(Object.keys(DAYS) as Period[]).map(p => <button key={p} data-active={period === p} onClick={() => setPeriod(p)}>{DAYS[p]} dias</button>)}</div>
          <button className="tt-btn" onClick={exportCSV}><Download size={14} /> Exportar</button>
          <RefreshBtn spinning={refreshing} onClick={() => { setRefreshing(true); load() }} />
        </>} />

      <div className="hk-5" style={{ marginBottom: 12 }}>
        <KpiCard icon={CircleDollarSign} label="Receita bruta" value={brl(t.receita)} foot={`${num(t.vendas)} vendas`} progress={1} loading={loading} />
        <KpiCard icon={Receipt} label="Gasto em ads" value={brl(t.gasto)} foot={`${t.receita ? ((t.gasto / t.receita) * 100).toFixed(0) : 0}% da receita`} progress={t.receita ? Math.min(1, t.gasto / t.receita) : 0} loading={loading} />
        <KpiCard icon={Package} label="Custo de produto" value={brl(t.custo)} foot={`${t.receita ? ((t.custo / t.receita) * 100).toFixed(0) : 0}% da receita`} progress={t.receita ? Math.min(1, t.custo / t.receita) : 0} loading={loading} />
        <KpiCard icon={TrendingUp} label="Lucro líquido" value={brl(t.lucro)} foot={`margem ${t.margem.toFixed(1).replace('.', ',')}%`} progress={Math.max(0, Math.min(1, t.margem / 50))} loading={loading} />
        <KpiCard icon={Target} label="ROAS" value={`${t.roas.toFixed(2).replace('.', ',')}x`} foot={lossDays ? `${lossDays} dia${lossDays === 1 ? '' : 's'} no prejuízo` : 'nenhum dia no prejuízo'} progress={Math.min(1, t.roas / 4)} loading={loading} />
      </div>

      <div className="hk-row2" style={{ marginBottom: 12 }}>
        <Panel>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, padding: '6px 18px 0', flexWrap: 'wrap' }}>
            <div className="tt-tabbar no-scrollbar" style={{ borderBottom: 0 }}>
              {([['dre', 'Receita x gasto x lucro'], ['roas', 'ROAS'], ['vendas', 'Vendas']] as [ChartTab, string][]).map(([k, l]) => <button key={k} className="tt-tab" data-active={chartTab === k} onClick={() => { setChartTab(k); setHidden({}) }}>{l}</button>)}
            </div>
            {series.length > 1 && <div style={{ marginBottom: 12 }}><SeriesLegend series={series} hidden={hidden} onToggle={k => setHidden(h => ({ ...h, [k]: !h[k] }))} /></div>}
          </div>
          <div style={{ height: 1, background: H.line }} />
          <div style={{ padding: '14px 10px 10px 0' }}>
            <HawkBars data={chart} series={series} hidden={hidden} height={290} money={chartTab === 'dre'} empty="O resumo diário ainda não rodou nesse período." />
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Leitura do período" sub={t.lucro > 0 && t.roas >= 1.5 ? 'Operação lucrativa' : t.receita > 0 ? 'Eficiência em atenção' : 'Aguardando dados'} />
          <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MiniStat label={best ? `Melhor dia · ${fmtDiaLong(best.dia)}` : 'Melhor dia'} value={best ? brl(best.lucro_liquido ?? 0) : '—'} tone="good" />
            <MiniStat label={worst ? `Pior dia · ${fmtDiaLong(worst.dia)}` : 'Pior dia'} value={worst ? brl(worst.lucro_liquido ?? 0) : '—'} tone={(worst?.lucro_liquido ?? 0) < 0 ? 'bad' : undefined} />
            <MiniStat label="Receita média / dia" value={brl(summaries.length ? t.receita / summaries.length : 0)} />
            <MiniStat label="Lucro médio / dia" value={brl(summaries.length ? t.lucro / summaries.length : 0)} tone={t.lucro < 0 ? 'bad' : undefined} />
          </div>
          <div style={{ padding: '0 18px 16px' }}>
            <div className="tt-cap" style={{ marginBottom: 6 }}>Composição da receita</div>
            <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', background: 'rgba(163,167,242,.08)' }}>
              {t.receita > 0 && [[t.gasto, '#4b5082', 'Ads'], [t.custo, '#8c91ea', 'Produto'], [Math.max(0, t.lucro), '#dcdefd', 'Lucro']].map(([v, c, l]) => (
                <div key={l as string} title={`${l}: ${brl(v as number)}`} style={{ width: `${((v as number) / t.receita) * 100}%`, background: c as string }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, color: H.sub }}>
              {[['Ads', '#4b5082'], ['Produto', '#8c91ea'], ['Lucro', '#dcdefd']].map(([l, c]) => <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}</span>)}
            </div>
          </div>
        </Panel>
      </div>

      <div className="hk-split">
        <Panel>
          <PanelHead title="DRE por dia" sub="Mais recente primeiro" />
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table className="tt-table" style={{ minWidth: 760 }}>
              <thead><tr>{['Dia', 'Receita', 'Gasto', 'Produto', 'Lucro', 'Margem', 'ROAS', 'Vendas'].map((h, i) => <th key={h} style={{ textAlign: i ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
              <tbody>
                {[...summaries].reverse().map(s => {
                  const l = s.lucro_liquido ?? 0, m = s.receita_bruta ? (l / s.receita_bruta) * 100 : 0
                  return (
                    <tr key={s.id}>
                      <td style={{ color: H.text, whiteSpace: 'nowrap' }}>{fmtDiaLong(s.dia)}</td>
                      <td style={{ textAlign: 'right', color: H.text }}>{brl(s.receita_bruta ?? 0)}</td>
                      <td style={{ textAlign: 'right', color: H.sub }}>{brl(s.gasto_ads ?? 0)}</td>
                      <td style={{ textAlign: 'right', color: H.sub }}>{brl(s.custo_produto ?? 0)}</td>
                      <td style={{ textAlign: 'right', color: l < 0 ? H.red : H.green, fontWeight: 700 }}>{brl(l)}</td>
                      <td style={{ textAlign: 'right', color: H.sub }}>{m.toFixed(1).replace('.', ',')}%</td>
                      <td style={{ textAlign: 'right', color: H.text }}>{(s.roas ?? 0).toFixed(2).replace('.', ',')}x</td>
                      <td style={{ textAlign: 'right', color: H.sub }}>{num(s.vendas_count ?? 0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {!loading && summaries.length === 0 && <Empty pad={40}>Sem resumo diário nesse período.</Empty>}
        </Panel>

        <Panel>
          <PanelHead title="Diário da operação" sub="Decisões, problemas e resultados"
            right={<button className="tt-btn" style={{ minHeight: 30, fontSize: 12 }} onClick={() => setShowForm(v => !v)}>{showForm ? <X size={13} /> : <Plus size={13} />}{showForm ? 'Cancelar' : 'Anotar'}</button>} />
          {showForm && (
            <div style={{ padding: '12px 18px', display: 'grid', gap: 8, borderBottom: `1px solid ${H.lineSoft}` }}>
              <div className="tt-segment">{Object.entries(TIPO).map(([k, v]) => <button key={k} data-active={form.tipo === k} onClick={() => setForm(f => ({ ...f, tipo: k }))}>{v.label}</button>)}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 8 }}>
                <input className="tt-input" placeholder="Título (opcional)" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
                <input className="tt-input" type="date" value={form.dia} onChange={e => setForm(f => ({ ...f, dia: e.target.value }))} />
              </div>
              <textarea className="tt-textarea" rows={3} placeholder="O que aconteceu? Ex.: subi o orçamento da CBO 3 pra R$ 500" value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))} />
              <button className="tt-btn tt-btn-primary" onClick={saveLog} disabled={savingLog || !form.conteudo.trim()}>{savingLog ? 'Salvando...' : 'Salvar anotação'}</button>
            </div>
          )}
          <div style={{ padding: '4px 18px 12px', maxHeight: 520, overflowY: 'auto' }}>
            {logs.length === 0 && <Empty pad={34}>Nenhuma anotação no período.</Empty>}
            {logs.map(l => (
              <div key={l.id} style={{ padding: '12px 0', borderBottom: `1px solid ${H.lineSoft}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <StatusPill tone={TIPO[l.tipo || 'observacao']?.tone || 'neutral'}>{TIPO[l.tipo || 'observacao']?.label || l.tipo}</StatusPill>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="tt-cap">{fmtDiaLong(l.dia)}</span>
                    <button onClick={() => deleteLog(l.id)} aria-label="Apagar" style={{ color: H.muted, display: 'inline-flex' }}><Trash2 size={12} /></button>
                  </div>
                </div>
                {l.titulo && <div style={{ color: H.text, fontWeight: 600, fontSize: 13, marginTop: 7 }}>{l.titulo}</div>}
                <div style={{ color: H.sub, fontSize: 12.5, lineHeight: 1.55, marginTop: 4, whiteSpace: 'pre-wrap' }}>{l.conteudo}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
