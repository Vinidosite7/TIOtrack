'use client'

import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Layers, Megaphone, Image, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { T } from '@/lib/tokens'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import { GridBg, Topbar, Pill, IconBtn, EmptyState, SkeletonRow, sharedStyles } from '@/components/ui/shared'
import { GlareCard } from '@/components/ui/aceternity'

type Period = 'hoje' | '7d' | '30d'
type Tab    = 'campanhas' | 'adsets' | 'anuncios'
type Source = 'todos' | 'tiktok' | 'meta'

type Row = {
  key: string; nome: string; conta?: string
  spend: number; receita: number; roas: number
  conversions: number; impressions: number; clicks: number
  ctr: number; cpm: number; cpc: number; score: string
}

function hoje() { return new Date().toISOString().split('T')[0] }
function diasAtras(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0] }
function toBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) }
function fmtNum(v: number) { if (v >= 1000000) return `${(v/1000000).toFixed(1)}M`; if (v >= 1000) return `${(v/1000).toFixed(1)}k`; return String(Math.round(v)) }
function calcScore(r: number) { if (r >= 3.5) return 'S'; if (r >= 2.5) return 'A'; if (r >= 1.5) return 'B'; if (r >= 0.8) return 'C'; return 'D' }

const SCORE_CFG: Record<string, { bg: string; color: string; glow: string }> = {
  S: { bg: 'rgba(59,130,246,0.12)',  color: '#60A5FA', glow: '0 0 10px rgba(59,130,246,0.4)'  },
  A: { bg: 'rgba(16,185,129,0.10)',  color: '#34D399', glow: '0 0 10px rgba(16,185,129,0.35)' },
  B: { bg: 'rgba(245,158,11,0.10)',  color: '#FCD34D', glow: '0 0 10px rgba(245,158,11,0.3)'  },
  C: { bg: 'rgba(244,63,94,0.08)',   color: '#FB7185', glow: '0 0 10px rgba(244,63,94,0.3)'   },
  D: { bg: 'rgba(100,100,120,0.08)', color: '#64748B', glow: 'none' },
}

function ScoreBadge({ score }: { score: string }) {
  const s = SCORE_CFG[score] ?? SCORE_CFG.D
  return (
    <span style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, fontFamily: T.mono, background: s.bg, color: s.color, boxShadow: s.glow }}>
      {score}
    </span>
  )
}

function TableRow({ row, rank }: { row: Row; rank: number }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer', background: open ? 'rgba(59,130,246,0.05)' : 'transparent', borderBottom: `1px solid ${T.borderSub}`, transition: 'background 100ms' }}>
        <td style={{ padding: '10px 10px 10px 16px', width: 32 }}>
          <span style={{ fontSize: 10, color: T.text3, fontFamily: T.mono }}>{String(rank).padStart(2,'0')}</span>
        </td>
        <td style={{ padding: '10px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {open ? <ChevronUp size={12} style={{ color: T.accent, flexShrink: 0 }} /> : <ChevronDown size={12} style={{ color: T.text3, flexShrink: 0 }} />}
            <div>
              <div style={{ fontSize: 12, color: T.text1, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.nome || '—'}</div>
              {row.conta && <div style={{ fontSize: 10, color: T.text3, marginTop: 1 }}>{row.conta}</div>}
            </div>
          </div>
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'center' }}><ScoreBadge score={row.score} /></td>
        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: T.mono, fontSize: 12, color: T.text1 }}>{toBRL(row.spend)}</td>
        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: T.mono, fontSize: 12, color: T.green }}>{toBRL(row.receita)}</td>
        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
          <span style={{ fontFamily: T.mono, fontSize: 12, color: row.roas >= 1.5 ? T.green : T.red, fontWeight: row.roas >= 1.5 ? 500 : 400 }}>{row.roas.toFixed(2)}x</span>
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: T.mono, fontSize: 11, color: T.text2 }}>{fmtNum(row.conversions)}</td>
        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: T.mono, fontSize: 11, color: T.text3 }}>{fmtNum(row.impressions)}</td>
        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: T.mono, fontSize: 11, color: T.text3 }}>{row.ctr.toFixed(2)}%</td>
        <td style={{ padding: '10px 16px 10px 8px', textAlign: 'right', fontFamily: T.mono, fontSize: 11, color: T.text3 }}>{toBRL(row.cpm)}</td>
      </tr>
      {open && (
        <tr style={{ background: 'rgba(59,130,246,0.03)', borderBottom: `1px solid ${T.borderSub}` }}>
          <td colSpan={10} style={{ padding: '0 16px 14px 52px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, paddingTop: 10 }}>
              {[
                { label: 'CPC',     value: toBRL(row.cpc) },
                { label: 'Cliques', value: fmtNum(row.clicks) },
                { label: 'CPV',     value: row.conversions > 0 ? toBRL(row.spend / row.conversions) : '—' },
                { label: 'Margem',  value: row.roas >= 1 ? `+${((row.roas-1)*100).toFixed(0)}%` : `${((row.roas-1)*100).toFixed(0)}%` },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'rgba(10,10,18,0.8)', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, color: T.text3, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 13, color: T.text1, fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function TH({ label, align = 'right' as const }: { label: string; align?: 'left'|'right'|'center' }) {
  return <th style={{ padding: '8px 8px', textAlign: align, fontSize: 10, color: T.text3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', background: T.bgSurface, borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{label}</th>
}

export default function CampanhasPage() {
  const { active: workspace } = useWorkspaceStore()

  const [source, setSource]   = useState<Source>('tiktok')
  const [period, setPeriod]   = useState<Period>('7d')
  const [tab, setTab]         = useState<Tab>('campanhas')
  const [filter, setFilter]   = useState('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // TikTok data
  const [tkData, setTkData]   = useState<any[]>([])
  const [bcs, setBcs]         = useState<{id:string;apelido:string}[]>([])

  // Meta data
  const [metaData, setMetaData]   = useState<any[]>([])
  const [metaAccs, setMetaAccs]   = useState<{account_fb_id:string;nome:string}[]>([])

  async function load(wid: string, p: Period) {
    setLoading(true)
    const from = p === 'hoje' ? hoje() : diasAtras(p === '7d' ? 7 : 30)

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

  // Agrega TikTok
  const tkRows = useMemo(() => {
    const filtered = filter === 'all' ? tkData : tkData.filter((r: any) => r.bc_config_id === filter)
    const bcMap = Object.fromEntries(bcs.map(b => [b.id, b.apelido]))
    const agg: Record<string, any> = {}
    for (const r of filtered) {
      const key  = tab === 'campanhas' ? r.campaign_id ?? 'x' : tab === 'adsets' ? r.adgroup_id ?? 'x' : r.ad_id ?? 'x'
      const nome = tab === 'campanhas' ? r.campaign_name ?? '—' : tab === 'adsets' ? r.adgroup_name ?? '—' : r.ad_name ?? '—'
      if (!agg[key]) agg[key] = { key, nome, conta: bcMap[r.bc_config_id], spend: 0, receita: 0, conversions: 0, impressions: 0, clicks: 0, ctr_s: 0, cpm_s: 0, cpc_s: 0, n: 0 }
      agg[key].spend += r.spend ?? 0; agg[key].receita += r.conversion_value ?? 0
      agg[key].conversions += r.conversions ?? 0; agg[key].impressions += r.impressions ?? 0
      agg[key].clicks += r.clicks ?? 0; agg[key].ctr_s += r.ctr ?? 0; agg[key].cpm_s += r.cpm ?? 0; agg[key].cpc_s += r.cpc ?? 0; agg[key].n++
    }
    return Object.values(agg).map((v: any): Row => ({
      key: v.key, nome: v.nome, conta: v.conta,
      spend: v.spend, receita: v.receita,
      roas: v.spend > 0 ? v.receita / v.spend : 0,
      conversions: v.conversions, impressions: v.impressions, clicks: v.clicks,
      ctr: v.n > 0 ? v.ctr_s / v.n : 0, cpm: v.n > 0 ? v.cpm_s / v.n : 0, cpc: v.n > 0 ? v.cpc_s / v.n : 0,
      score: calcScore(v.spend > 0 ? v.receita / v.spend : 0),
    })).sort((a, b) => b.spend - a.spend)
  }, [tkData, tab, filter, bcs])

  // Agrega Meta
  const metaRows = useMemo(() => {
    const filtered = filter === 'all' ? metaData : metaData.filter((r: any) => r.account_fb_id === filter)
    const accMap = Object.fromEntries(metaAccs.map(a => [a.account_fb_id, a.nome]))
    const agg: Record<string, any> = {}
    for (const r of filtered) {
      const key  = tab === 'campanhas' ? r.campaign_id ?? r.campaign_name ?? 'x' : tab === 'adsets' ? r.adset_id ?? r.adset_name ?? 'x' : r.ad_id ?? 'x'
      const nome = tab === 'campanhas' ? r.campaign_name ?? '—' : tab === 'adsets' ? r.adset_name ?? '—' : r.ad_name ?? '—'
      if (!agg[key]) agg[key] = { key, nome, conta: accMap[r.account_fb_id], spend: 0, receita: 0, conversions: 0, impressions: 0, clicks: 0, ctr_s: 0, cpm_s: 0, cpc_s: 0, n: 0 }
      agg[key].spend += r.spend ?? 0; agg[key].receita += r.conversion_value ?? 0
      agg[key].conversions += r.conversions ?? 0; agg[key].impressions += r.impressions ?? 0
      agg[key].clicks += r.clicks ?? 0; agg[key].ctr_s += r.ctr ?? 0; agg[key].cpm_s += r.cpm ?? 0; agg[key].cpc_s += r.cpc ?? 0; agg[key].n++
    }
    return Object.values(agg).map((v: any): Row => ({
      key: v.key, nome: v.nome, conta: v.conta,
      spend: v.spend, receita: v.receita,
      roas: v.spend > 0 ? v.receita / v.spend : 0,
      conversions: v.conversions, impressions: v.impressions, clicks: v.clicks,
      ctr: v.n > 0 ? v.ctr_s / v.n : 0, cpm: v.n > 0 ? v.cpm_s / v.n : 0, cpc: v.n > 0 ? v.cpc_s / v.n : 0,
      score: calcScore(v.spend > 0 ? v.receita / v.spend : 0),
    })).sort((a, b) => b.spend - a.spend)
  }, [metaData, tab, filter, metaAccs])

  const allRows = (() => {
    if (source === 'todos') {
      // Consolida TikTok + Meta por nome de campanha
      const map: Record<string, Row> = {}
      const merge = (r: Row) => {
        if (!map[r.nome]) { map[r.nome] = { ...r }; return }
        const e = map[r.nome]
        e.spend       += r.spend
        e.receita     += r.receita
        e.conversions += r.conversions
        e.impressions += r.impressions
        e.clicks      += r.clicks
        e.roas         = e.spend > 0 ? e.receita / e.spend : 0
        e.score        = calcScore(e.roas)
        e.ctr          = e.impressions > 0 ? e.clicks / e.impressions * 100 : 0
        e.cpm          = e.impressions > 0 ? e.spend / e.impressions * 1000 : 0
        e.cpc          = e.clicks > 0 ? e.spend / e.clicks : 0
      }
      tkRows.forEach(merge); metaRows.forEach(merge)
      return Object.values(map).sort((a, b) => b.spend - a.spend)
    }
    return source === 'tiktok' ? tkRows : metaRows
  })()
  const rows = allRows
  const totais = {
    spend:       rows.reduce((s, r) => s + r.spend, 0),
    receita:     rows.reduce((s, r) => s + r.receita, 0),
    conversions: rows.reduce((s, r) => s + r.conversions, 0),
    roas:        rows.reduce((s, r) => s + r.spend, 0) > 0
                   ? rows.reduce((s, r) => s + r.receita, 0) / rows.reduce((s, r) => s + r.spend, 0) : 0,
  }

  const filterOptions = source === 'tiktok'
    ? bcs.map(b => ({ id: b.id, label: b.apelido }))
    : metaAccs.map(a => ({ id: a.account_fb_id, label: a.nome }))

  const TABS = [
    { key: 'campanhas', label: 'Campanhas', icon: Layers },
    { key: 'adsets',    label: source === 'tiktok' ? 'Adsets' : 'Conjuntos', icon: Megaphone },
    { key: 'anuncios',  label: 'Anúncios',  icon: Image },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#070812', position: 'relative' }}>
      <GridBg />

      <div className="camp-topbar" style={{height:50,borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',padding:'0 20px',gap:8,flexShrink:0,background:'rgba(5,8,16,0.9)',backdropFilter:'blur(16px)',position:'relative',zIndex:10,overflowX:'auto'}}>
        {/* Source switcher TikTok / Meta */}
        <div style={{ display: 'flex', gap: 2, background: 'rgba(10,10,18,0.8)', border: `1px solid ${T.border}`, borderRadius: 8, padding: 2 }}>
          {[
            { key: 'todos',  label: '⚡ Todos' },
            { key: 'tiktok', label: '🎵 TikTok' },
            { key: 'meta',   label: '📘 Meta' },
          ].map(s => (
            <button key={s.key} onClick={() => { setSource(s.key as Source); setFilter('all') }} style={{
              height: 24, padding: '0 12px', borderRadius: 6,
              background: source === s.key ? T.bgSurface : 'transparent',
              border: `1px solid ${source === s.key ? T.border : 'transparent'}`,
              color: source === s.key ? T.text1 : T.text3,
              fontSize: 11, cursor: 'pointer', fontFamily: T.sans, fontWeight: source === s.key ? 500 : 400,
              transition: 'all 160ms',
            }}>{s.label}</button>
          ))}
        </div>

        {/* Filtro por conta */}
        {source !== 'todos' && filterOptions.length > 1 && (
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ height: 26, padding: '0 8px', background: 'rgba(10,10,18,0.8)', border: `1px solid ${T.border}`, borderRadius: 6, color: T.text2, fontSize: 11, cursor: 'pointer', outline: 'none' }}>
            <option value="all">Todas as contas</option>
            {filterOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        )}

        {(['hoje','7d','30d'] as Period[]).map(p => <Pill key={p} label={p === 'hoje' ? 'Hoje' : p} active={period === p} onClick={() => setPeriod(p)} />)}
        <IconBtn onClick={() => { if (workspace?.id) { setRefreshing(true); load(workspace.id, period) } }}>
          <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        </IconBtn>
      </div>

      {/* Tabs */}
      <div className="camp-tabs" style={{ height: 40, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 2, flexShrink: 0, background: 'rgba(5,8,16,0.6)', backdropFilter: 'blur(8px)', position: 'relative', zIndex: 9, overflowX: 'auto' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as Tab)} style={{
            height: 32, padding: '0 14px', borderRadius: 0, background: 'transparent', border: 'none',
            color: tab === key ? T.text1 : T.text3, fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            borderBottom: `2px solid ${tab === key ? T.accent : 'transparent'}`,
            transition: 'all 160ms', fontFamily: T.sans, fontWeight: tab === key ? 500 : 400,
          }}>
            <Icon size={13} style={{ color: tab === key ? T.accent : T.text3 }} />{label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {/* KPIs */}
        {!loading && rows.length > 0 && (
          <div className="camp-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            {[
              { label: 'Gasto total',   value: toBRL(totais.spend),   color: T.text1 },
              { label: 'Receita total', value: toBRL(totais.receita), color: T.green },
              { label: 'ROAS geral',    value: `${totais.roas.toFixed(2)}x`, color: totais.roas >= 1.5 ? T.accent : T.red },
              { label: 'Conversões',    value: fmtNum(totais.conversions), color: T.text1 },
            ].map((k, i) => (
              <div key={k.label} style={{ padding: '10px 20px', borderRight: i < 3 ? `1px solid ${T.border}` : 'none' }}>
                <div style={{ fontSize: 10, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{k.label}</div>
                <div style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 600, color: k.color, letterSpacing: '-0.02em' }}>{k.value}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {rows.length === 0 && !loading ? (
            <EmptyState
              icon={AlertCircle}
              title="Nenhum dado encontrado."
              sub={source === 'tiktok'
                ? 'Conecte uma BC em Integrações e sincronize.'
                : 'Conecte uma conta Meta em Integrações e clique em Sincronizar.'}
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <TH label="#" align="left" /><TH label="Nome" align="left" /><TH label="Score" align="center" />
                  <TH label="Gasto" /><TH label="Receita" /><TH label="ROAS" />
                  <TH label="Conv." /><TH label="Impres." /><TH label="CTR" /><TH label="CPM" />
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({length:6}).map((_,i) => <SkeletonRow key={i} cols={10} />)
                  : rows.map((row, i) => <TableRow key={row.key} row={row} rank={i+1} />)
                }
              </tbody>
            </table>
          )}
        </div>
      </div>
      <style>{sharedStyles + `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@media(max-width:768px){.camp-topbar{flex-wrap:wrap;height:auto!important;padding:10px 14px!important;gap:6px!important}.camp-kpis{grid-template-columns:repeat(2,1fr)!important}.camp-tabs{overflow-x:auto}}`}</style>
    </div>
  )
}
