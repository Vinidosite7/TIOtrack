'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Receipt, CircleDollarSign, Target, Crosshair, RefreshCw, Search, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import { H, Panel, KpiCard, Empty, brl, short } from '@/components/hawk/ui'

type Period = 'hoje' | '7d' | '30d'
type Tab = 'campanhas' | 'adsets' | 'anuncios'
type Source = 'todos' | 'tiktok' | 'meta'
type Health = 'todos' | 'escala' | 'atencao'
type SortKey = 'spend' | 'receita' | 'roas' | 'conversions' | 'cpa' | 'ctr' | 'cpm' | 'nome'
type Row = { key: string; id: string; nome: string; platform: 'tiktok' | 'meta'; conta?: string; spend: number; receita: number; roas: number; conversions: number; cpa: number; impressions: number; clicks: number; ctr: number; cpm: number; cpc: number; score: string }

const hoje = () => new Date().toISOString().split('T')[0]
const diasAtras = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0] }
const calcScore = (r: number) => r >= 3.5 ? 'S' : r >= 2.5 ? 'A' : r >= 1.5 ? 'B' : r >= 0.8 ? 'C' : 'D'
const scoreColor: Record<string, string> = { S: '#dcdefd', A: H.green, B: H.amber, C: '#f0a3b0', D: H.muted }
const PLATFORM = { tiktok: { label: 'TikTok', color: '#dcdefd' }, meta: { label: 'Meta', color: '#8c91ea' } }

export default function CampanhasPage() {
  const { active: workspace } = useWorkspaceStore()
  const [source, setSource] = useState<Source>('todos')
  const [period, setPeriod] = useState<Period>('7d')
  const [tab, setTab] = useState<Tab>('campanhas')
  const [filter, setFilter] = useState('all')
  const [health, setHealth] = useState<Health>('todos')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'spend', dir: -1 })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tkData, setTkData] = useState<any[]>([])
  const [bcs, setBcs] = useState<{ id: string; apelido: string }[]>([])
  const [metaData, setMetaData] = useState<any[]>([])
  const [metaAccs, setMetaAccs] = useState<{ account_fb_id: string; nome: string }[]>([])

  async function load(wid: string, p: Period) {
    setLoading(true)
    const from = p === 'hoje' ? hoje() : diasAtras(p === '7d' ? 6 : 29)
    const [tkRes, bcRes, metaRes, maRes] = await Promise.all([
      supabase.from('ad_spend_daily').select('campaign_id,campaign_name,adgroup_id,adgroup_name,ad_id,ad_name,bc_config_id,spend,conversion_value,conversions,impressions,clicks,ctr,cpm,cpc').eq('workspace_id', wid).gte('dia', from).lte('dia', hoje()),
      supabase.from('bc_configs').select('id,apelido').eq('workspace_id', wid),
      (supabase as any).from('meta_ad_spend_daily').select('campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,account_fb_id,spend,conversion_value,conversions,impressions,clicks,ctr,cpm,cpc').eq('workspace_id', wid).gte('dia', from).lte('dia', hoje()),
      (supabase as any).from('meta_ad_accounts').select('account_fb_id,nome').eq('workspace_id', wid),
    ])
    setTkData(tkRes.data ?? [])
    setBcs(bcRes.data ?? [])
    setMetaData((metaRes as any).data ?? [])
    setMetaAccs((maRes as any).data ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { if (workspace?.id) load(workspace.id, period) }, [workspace?.id, period])
  useEffect(() => { setSelected(new Set()) }, [tab, source, period, workspace?.id])

  const aggregate = (rows: any[], platform: 'tiktok' | 'meta'): Row[] => {
    const accountMap = platform === 'tiktok' ? Object.fromEntries(bcs.map(b => [b.id, b.apelido])) : Object.fromEntries(metaAccs.map(a => [a.account_fb_id, a.nome]))
    const filtered = filter === 'all' ? rows : rows.filter((r: any) => platform === 'tiktok' ? r.bc_config_id === filter : r.account_fb_id === filter)
    const agg: Record<string, any> = {}
    for (const r of filtered) {
      const id = tab === 'campanhas' ? (r.campaign_id || r.campaign_name || 'x') : tab === 'adsets' ? (platform === 'tiktok' ? r.adgroup_id : r.adset_id) || 'x' : r.ad_id || 'x'
      const nome = tab === 'campanhas' ? r.campaign_name : tab === 'adsets' ? (platform === 'tiktok' ? r.adgroup_name : r.adset_name) : r.ad_name
      const key = `${platform}:${id}`
      if (!agg[key]) agg[key] = { key, id: String(id), platform, nome: nome || '—', conta: accountMap[platform === 'tiktok' ? r.bc_config_id : r.account_fb_id], spend: 0, receita: 0, conversions: 0, impressions: 0, clicks: 0, cpc: 0, n: 0 }
      const a = agg[key]
      a.spend += Number(r.spend || 0); a.receita += Number(r.conversion_value || 0); a.conversions += Number(r.conversions || 0); a.impressions += Number(r.impressions || 0); a.clicks += Number(r.clicks || 0); a.cpc += Number(r.cpc || 0); a.n++
    }
    return Object.values(agg).map((a: any): Row => {
      const roas = a.spend > 0 ? a.receita / a.spend : 0
      return {
        ...a, roas, score: calcScore(roas),
        cpa: a.conversions > 0 ? a.spend / a.conversions : 0,
        // CTR/CPM ponderados por impressão (média de médias distorce)
        ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
        cpm: a.impressions > 0 ? (a.spend / a.impressions) * 1000 : 0,
        cpc: a.n ? a.cpc / a.n : 0,
      }
    })
  }

  const tkRows = useMemo(() => aggregate(tkData, 'tiktok'), [tkData, tab, filter, bcs])
  const metaRows = useMemo(() => aggregate(metaData, 'meta'), [metaData, tab, filter, metaAccs])

  const rows = useMemo(() => source === 'tiktok' ? tkRows : source === 'meta' ? metaRows : [...tkRows, ...metaRows], [source, tkRows, metaRows])

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows
      .filter(r => !q || `${r.nome} ${r.id} ${r.conta || ''}`.toLowerCase().includes(q))
      .filter(r => health === 'todos' || (health === 'escala' ? r.roas >= 2.5 : r.spend > 0 && r.roas < 1))
      .sort((a, b) => sort.key === 'nome' ? a.nome.localeCompare(b.nome) * sort.dir : ((a[sort.key] as number) - (b[sort.key] as number)) * sort.dir)
  }, [rows, search, health, sort])

  const sum = (list: Row[]) => {
    const spend = list.reduce((s, r) => s + r.spend, 0)
    const receita = list.reduce((s, r) => s + r.receita, 0)
    const conversions = list.reduce((s, r) => s + r.conversions, 0)
    return { spend, receita, conversions, roas: spend > 0 ? receita / spend : 0, cpa: conversions > 0 ? spend / conversions : 0 }
  }
  const totals = useMemo(() => ({ ...sum(visibleRows), scalable: visibleRows.filter(r => r.roas >= 2.5).length, risky: visibleRows.filter(r => r.spend > 0 && r.roas < 1).length }), [visibleRows])
  const selTotals = useMemo(() => sum(visibleRows.filter(r => selected.has(r.key))), [visibleRows, selected])

  const filterOptions = source === 'tiktok' ? bcs.map(b => ({ id: b.id, label: b.apelido })) : source === 'meta' ? metaAccs.map(a => ({ id: a.account_fb_id, label: a.nome })) : []
  const tabs: { key: Tab; label: string }[] = [{ key: 'campanhas', label: 'Campanhas' }, { key: 'adsets', label: 'Grupos de anúncios' }, { key: 'anuncios', label: 'Anúncios' }]
  const entity = tab === 'campanhas' ? 'Campanha' : tab === 'adsets' ? 'Grupo de anúncios' : 'Anúncio'
  const allChecked = visibleRows.length > 0 && visibleRows.every(r => selected.has(r.key))

  function toggle(key: string) { setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n }) }
  function toggleAll() { setSelected(allChecked ? new Set() : new Set(visibleRows.map(r => r.key))) }
  function sortBy(key: SortKey) { setSort(s => s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'nome' ? 1 : -1 }) }

  const cols: { key: SortKey | null; label: string; align: 'left' | 'right' }[] = [
    { key: 'nome', label: entity, align: 'left' },
    { key: null, label: 'Plataforma', align: 'left' },
    { key: null, label: 'Score', align: 'left' },
    { key: 'spend', label: 'Gastos', align: 'right' },
    { key: 'receita', label: 'Receita', align: 'right' },
    { key: 'roas', label: 'ROAS', align: 'right' },
    { key: 'conversions', label: 'Conv.', align: 'right' },
    { key: 'cpa', label: 'CPA', align: 'right' },
    { key: 'ctr', label: 'CTR', align: 'right' },
    { key: 'cpm', label: 'CPM', align: 'right' },
  ]

  return (
    <div className="shell-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h1 className="tt-title">Campanhas</h1>
          <div className="tt-cap" style={{ marginTop: 4 }}>TikTok + Meta · {visibleRows.length} {entity.toLowerCase()}{visibleRows.length === 1 ? '' : 's'} no filtro</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="tt-segment">{(['hoje', '7d', '30d'] as Period[]).map(p => <button key={p} data-active={period === p} onClick={() => setPeriod(p)}>{p === 'hoje' ? 'Hoje' : p === '7d' ? '7 dias' : '30 dias'}</button>)}</div>
          <button className="tt-icon-btn" aria-label="Atualizar" title="Atualizar" onClick={() => { if (workspace?.id) { setRefreshing(true); load(workspace.id, period) } }}><RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : undefined }} /></button>
        </div>
      </div>

      <div className="tt-grid-4" style={{ marginBottom: 12, gap: 12 }}>
        <KpiCard icon={Receipt} label="Gastos" value={brl(totals.spend)} foot={`${visibleRows.length} itens no filtro`} progress={1} loading={loading} />
        <KpiCard icon={CircleDollarSign} label="Faturamento atribuído" value={brl(totals.receita)} foot={`${totals.conversions} conversões`} progress={totals.spend ? Math.min(1, totals.receita / (totals.spend * 4)) : 0} loading={loading} />
        <KpiCard icon={Target} label="ROAS" value={`${totals.roas.toFixed(2).replace('.', ',')}x`} foot={`${totals.scalable} prontas p/ escalar`} progress={Math.min(1, totals.roas / 4)} loading={loading} />
        <KpiCard icon={Crosshair} label="CPA" value={brl(totals.cpa)} foot={totals.risky ? `${totals.risky} com ROAS < 1` : 'nenhuma no vermelho'} progress={visibleRows.length ? 1 - totals.risky / visibleRows.length : 0} loading={loading} />
      </div>

      <Panel>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, padding: '6px 18px 0', flexWrap: 'wrap' }}>
          <div className="tt-tabbar no-scrollbar" style={{ borderBottom: 0 }}>
            {tabs.map(t => <button key={t.key} className="tt-tab" data-active={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</button>)}
          </div>
          <div className="tt-segment" style={{ marginBottom: 6 }}>
            {(['todos', 'tiktok', 'meta'] as Source[]).map(s => <button key={s} data-active={source === s} onClick={() => { setSource(s); setFilter('all') }}>{s === 'todos' ? 'Todas' : PLATFORM[s].label}</button>)}
          </div>
        </div>
        <div style={{ height: 1, background: H.line }} />

        <div style={{ display: 'flex', gap: 8, padding: '12px 18px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '0 1 300px', minWidth: 220 }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: 12, color: H.muted }} />
            <input className="tt-input" style={{ paddingLeft: 32 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome ou ID..." />
          </div>
          <select className="tt-select" style={{ width: 170 }} value={health} onChange={e => setHealth(e.target.value as Health)}>
            <option value="todos">Todos os status</option>
            <option value="escala">Escaláveis (ROAS ≥ 2,5)</option>
            <option value="atencao">Atenção (ROAS &lt; 1)</option>
          </select>
          {filterOptions.length > 0 && (
            <select className="tt-select" style={{ width: 200 }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">Todas as contas</option>
              {filterOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: H.sub, minHeight: 36 }}>
            {selected.size > 0 ? (
              <>
                <span><b style={{ color: H.text }}>{selected.size}</b> selecionado{selected.size === 1 ? '' : 's'}</span>
                <span style={{ color: H.muted }}>·</span>
                <span>Gasto <b style={{ color: H.text }}>{brl(selTotals.spend)}</b></span>
                <span>Receita <b style={{ color: H.text }}>{brl(selTotals.receita)}</b></span>
                <span>ROAS <b style={{ color: H.text }}>{selTotals.roas.toFixed(2).replace('.', ',')}x</b></span>
                <button className="tt-icon-btn" style={{ width: 28, height: 28 }} onClick={() => setSelected(new Set())} aria-label="Limpar seleção"><X size={13} /></button>
              </>
            ) : <span style={{ color: H.muted }}>Selecione linhas para somar</span>}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="tt-table" style={{ minWidth: 1040 }}>
            <thead>
              <tr>
                <th style={{ width: 40, paddingRight: 0 }}><input type="checkbox" className="tt-check" checked={allChecked} onChange={toggleAll} aria-label="Selecionar todos" /></th>
                {cols.map(c => (
                  <th key={c.label} style={{ textAlign: c.align, cursor: c.key ? 'pointer' : 'default', userSelect: 'none' }} onClick={() => c.key && sortBy(c.key)}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: sort.key === c.key ? H.text : undefined }}>
                      {c.label}
                      {sort.key === c.key && (sort.dir === -1 ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(row => {
                const on = selected.has(row.key)
                return (
                  <tr key={row.key} style={{ background: on ? 'rgba(163,167,242,.06)' : undefined }}>
                    <td style={{ paddingRight: 0 }}><input type="checkbox" className="tt-check" checked={on} onChange={() => toggle(row.key)} aria-label={`Selecionar ${row.nome}`} /></td>
                    <td style={{ maxWidth: 380 }}>
                      <div style={{ color: H.text, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.nome}</div>
                      <div className="tt-mono" style={{ color: H.muted, fontSize: 10.5, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.id}{row.conta ? ` · ${row.conta}` : ''}</div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: H.sub, fontSize: 12 }}>
                        <span className="tt-status-dot" style={{ width: 6, height: 6, background: PLATFORM[row.platform].color }} />{PLATFORM[row.platform].label}
                      </span>
                    </td>
                    <td><span style={{ display: 'inline-grid', placeItems: 'center', width: 24, height: 24, borderRadius: 7, background: `${scoreColor[row.score]}14`, border: `1px solid ${scoreColor[row.score]}33`, color: scoreColor[row.score], fontWeight: 800, fontSize: 11 }}>{row.score}</span></td>
                    <td style={{ textAlign: 'right', color: H.text, fontWeight: 600 }}>{brl(row.spend)}</td>
                    <td style={{ textAlign: 'right', color: H.text }}>{brl(row.receita)}</td>
                    <td style={{ textAlign: 'right', color: row.roas >= 2 ? H.green : row.roas >= 1 ? H.amber : row.spend > 0 ? H.red : H.muted, fontWeight: 700 }}>{row.roas.toFixed(2).replace('.', ',')}x</td>
                    <td style={{ textAlign: 'right', color: H.sub }}>{short(row.conversions)}</td>
                    <td style={{ textAlign: 'right', color: H.sub }}>{row.cpa ? brl(row.cpa, 2) : '—'}</td>
                    <td style={{ textAlign: 'right', color: H.sub }}>{row.ctr.toFixed(2).replace('.', ',')}%</td>
                    <td style={{ textAlign: 'right', color: H.sub }}>{brl(row.cpm, 2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!loading && visibleRows.length === 0 && <Empty pad={44}>Sem dados para esse filtro.</Empty>}
        <div className="tt-cap" style={{ padding: '12px 18px' }}>{visibleRows.length} de {rows.length}</div>
      </Panel>
    </div>
  )
}
