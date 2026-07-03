'use client'

import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Layers, Megaphone, Image, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import { SpotlightCard } from '@/components/ui/aceternity'

type Period = 'hoje' | '7d' | '30d'
type Tab    = 'campanhas' | 'adsets' | 'anuncios'
type Source = 'todos' | 'tiktok' | 'meta'

const T = {
  bg: 'rgba(8,8,14,0.92)', border: 'rgba(255,255,255,0.055)',
  text: '#dcdcf0', sub: '#8a8aaa', muted: '#4a4a6a',
  green: '#10b981', red: '#ef4444', amber: '#f59e0b',
  blue: '#3b82f6', mono: "'JetBrains Mono', monospace",
  sans: "'DM Sans', sans-serif", display: "'Syne', sans-serif",
}

type Row = {
  key: string; nome: string; conta?: string
  spend: number; receita: number; roas: number
  conversions: number; impressions: number; clicks: number
  ctr: number; cpm: number; cpc: number; score: string
}

const hoje      = () => new Date().toISOString().split('T')[0]
const diasAtras = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0] }
const toBRL     = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtNum    = (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(1)}k` : String(Math.round(v))
const calcScore = (r: number) => r >= 3.5 ? 'S' : r >= 2.5 ? 'A' : r >= 1.5 ? 'B' : r >= 0.8 ? 'C' : 'D'

const SCORE: Record<string, { bg: string; color: string }> = {
  S: { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  A: { bg: 'rgba(16,185,129,0.12)',  color: '#34d399' },
  B: { bg: 'rgba(245,158,11,0.12)',  color: '#fcd34d' },
  C: { bg: 'rgba(239,68,68,0.10)',   color: '#fb7185' },
  D: { bg: 'rgba(100,116,139,0.08)', color: '#64748b' },
}

function ScoreBadge({ score }: { score: string }) {
  const s = SCORE[score] ?? SCORE.D
  return (
    <span style={{ width: 24, height: 24, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, fontFamily: T.mono, background: s.bg, color: s.color, flexShrink: 0 }}>
      {score}
    </span>
  )
}

function TableRow({ row, rank }: { row: Row; rank: number }) {
  const [open, setOpen] = useState(false)
  const roasColor = row.roas >= 2.5 ? T.green : row.roas >= 1 ? T.amber : T.red

  return (
    <>
      <tr onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer', background: open ? 'rgba(59,130,246,0.04)' : 'transparent', borderBottom: `1px solid ${T.border}`, transition: 'background 100ms' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}>
        <td style={{ padding: '10px 10px 10px 16px', width: 32 }}>
          <span style={{ fontSize: 10, color: T.muted, fontFamily: T.mono }}>{String(rank).padStart(2, '0')}</span>
        </td>
        <td style={{ padding: '10px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {open
              ? <ChevronUp size={12} style={{ color: T.blue, flexShrink: 0 }}/>
              : <ChevronDown size={12} style={{ color: T.muted, flexShrink: 0 }}/>}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: T.text, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: T.sans }}>{row.nome || '—'}</div>
              {row.conta && <div style={{ fontSize: 10, color: T.muted, marginTop: 1, fontFamily: T.sans }}>{row.conta}</div>}
            </div>
          </div>
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'center' }}><ScoreBadge score={row.score}/></td>
        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: T.mono, fontSize: 12, color: T.text }}>{toBRL(row.spend)}</td>
        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: T.mono, fontSize: 12, color: T.green }}>{toBRL(row.receita)}</td>
        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
          <span style={{ fontFamily: T.mono, fontSize: 12, color: roasColor, fontWeight: 600 }}>{row.roas.toFixed(2)}x</span>
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: T.mono, fontSize: 11, color: T.sub }}>{fmtNum(row.conversions)}</td>
        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: T.mono, fontSize: 11, color: T.muted }}>{fmtNum(row.impressions)}</td>
        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: T.mono, fontSize: 11, color: T.muted }}>{row.ctr.toFixed(2)}%</td>
        <td style={{ padding: '10px 16px 10px 8px', textAlign: 'right', fontFamily: T.mono, fontSize: 11, color: T.muted }}>{toBRL(row.cpm)}</td>
      </tr>
      {open && (
        <tr style={{ background: 'rgba(59,130,246,0.03)', borderBottom: `1px solid ${T.border}` }}>
          <td colSpan={10} style={{ padding: '0 16px 14px 52px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, paddingTop: 10 }}>
              {[
                { label: 'CPC',    value: toBRL(row.cpc) },
                { label: 'Cliques', value: fmtNum(row.clicks) },
                { label: 'CPV',    value: row.conversions > 0 ? toBRL(row.spend / row.conversions) : '—' },
                { label: 'Margem', value: row.roas >= 1 ? `+${((row.roas-1)*100).toFixed(0)}%` : `${((row.roas-1)*100).toFixed(0)}%` },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'rgba(10,10,18,0.8)', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, color: T.muted, marginBottom: 3, textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: T.display }}>{label}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 13, color: T.text, fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function CampanhasPage() {
  const { active: workspace } = useWorkspaceStore()
  const [source, setSource]   = useState<Source>('tiktok')
  const [period, setPeriod]   = useState<Period>('7d')
  const [tab, setTab]         = useState<Tab>('campanhas')
  const [filter, setFilter]   = useState('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tkData, setTkData]   = useState<any[]>([])
  const [bcs, setBcs]         = useState<{id:string;apelido:string}[]>([])
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
    setTkData(tkRes.data ?? []); setBcs(bcRes.data ?? [])
    setMetaData((metaRes as any).data ?? []); setMetaAccs((maRes as any).data ?? [])
    setLoading(false); setRefreshing(false)
  }

  useEffect(() => { if (workspace?.id) load(workspace.id, period) }, [workspace?.id, period])

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
    return Object.values(agg).map((v: any): Row => ({ key: v.key, nome: v.nome, conta: v.conta, spend: v.spend, receita: v.receita, roas: v.spend > 0 ? v.receita / v.spend : 0, conversions: v.conversions, impressions: v.impressions, clicks: v.clicks, ctr: v.n > 0 ? v.ctr_s / v.n : 0, cpm: v.n > 0 ? v.cpm_s / v.n : 0, cpc: v.n > 0 ? v.cpc_s / v.n : 0, score: calcScore(v.spend > 0 ? v.receita / v.spend : 0) })).sort((a, b) => b.spend - a.spend)
  }, [tkData, tab, filter, bcs])

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
    return Object.values(agg).map((v: any): Row => ({ key: v.key, nome: v.nome, conta: v.conta, spend: v.spend, receita: v.receita, roas: v.spend > 0 ? v.receita / v.spend : 0, conversions: v.conversions, impressions: v.impressions, clicks: v.clicks, ctr: v.n > 0 ? v.ctr_s / v.n : 0, cpm: v.n > 0 ? v.cpm_s / v.n : 0, cpc: v.n > 0 ? v.cpc_s / v.n : 0, score: calcScore(v.spend > 0 ? v.receita / v.spend : 0) })).sort((a, b) => b.spend - a.spend)
  }, [metaData, tab, filter, metaAccs])

  const rows = (() => {
    if (source === 'todos') {
      const map: Record<string, Row> = {}
      const merge = (r: Row) => {
        if (!map[r.nome]) { map[r.nome] = { ...r }; return }
        const e = map[r.nome]
        e.spend += r.spend; e.receita += r.receita; e.conversions += r.conversions
        e.impressions += r.impressions; e.clicks += r.clicks
        e.roas = e.spend > 0 ? e.receita / e.spend : 0; e.score = calcScore(e.roas)
        e.ctr = e.impressions > 0 ? e.clicks / e.impressions * 100 : 0
        e.cpm = e.impressions > 0 ? e.spend / e.impressions * 1000 : 0
        e.cpc = e.clicks > 0 ? e.spend / e.clicks : 0
      }
      tkRows.forEach(merge); metaRows.forEach(merge)
      return Object.values(map).sort((a, b) => b.spend - a.spend)
    }
    return source === 'tiktok' ? tkRows : metaRows
  })()

  const totais = {
    spend:       rows.reduce((s, r) => s + r.spend, 0),
    receita:     rows.reduce((s, r) => s + r.receita, 0),
    conversions: rows.reduce((s, r) => s + r.conversions, 0),
    roas:        rows.reduce((s, r) => s + r.spend, 0) > 0 ? rows.reduce((s, r) => s + r.receita, 0) / rows.reduce((s, r) => s + r.spend, 0) : 0,
  }

  const filterOptions = source === 'tiktok' ? bcs.map(b => ({ id: b.id, label: b.apelido })) : metaAccs.map(a => ({ id: a.account_fb_id, label: a.nome }))
  const TABS = [
    { key: 'campanhas', label: 'Campanhas', icon: Layers },
    { key: 'adsets',    label: source === 'tiktok' ? 'Adsets' : 'Conjuntos', icon: Megaphone },
    { key: 'anuncios',  label: 'Anúncios', icon: Image },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0b0f14', position: 'relative' }}>

      {/* Topbar */}
      <div style={{ height: 50, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 8, flexShrink: 0, background: 'rgba(8,8,14,0.88)', backdropFilter: 'blur(20px)', position: 'relative', zIndex: 10, overflowX: 'auto' }}>
        {/* Source switcher */}
        <div style={{ display: 'flex', gap: 2, background: 'rgba(10,10,18,0.8)', border: `1px solid ${T.border}`, borderRadius: 8, padding: 2, flexShrink: 0 }}>
          {[{ key: 'todos', label: '⚡ Todos' }, { key: 'tiktok', label: '🎵 TikTok' }, { key: 'meta', label: '📘 Meta' }].map(s => (
            <button key={s.key} onClick={() => { setSource(s.key as Source); setFilter('all') }}
              style={{ height: 26, padding: '0 12px', borderRadius: 6, background: source === s.key ? 'rgba(255,255,255,0.06)' : 'transparent', border: `1px solid ${source === s.key ? T.border : 'transparent'}`, color: source === s.key ? T.text : T.muted, fontSize: 11, cursor: 'pointer', fontFamily: T.sans, fontWeight: source === s.key ? 500 : 400, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Filtro conta */}
        {source !== 'todos' && filterOptions.length > 1 && (
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ height: 28, padding: '0 8px', background: 'rgba(10,10,18,0.8)', border: `1px solid ${T.border}`, borderRadius: 8, color: T.sub, fontSize: 11, cursor: 'pointer', outline: 'none', flexShrink: 0 }}>
            <option value="all">Todas as contas</option>
            {filterOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        )}

        <div style={{ flex: 1 }}/>

        {/* Período */}
        {(['hoje', '7d', '30d'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ height: 28, padding: '0 12px', borderRadius: 8, background: period === p ? 'rgba(59,130,246,0.12)' : 'transparent', border: `1px solid ${period === p ? 'rgba(59,130,246,0.3)' : T.border}`, color: period === p ? '#60a5fa' : T.muted, fontSize: 11, cursor: 'pointer', fontFamily: T.sans, fontWeight: period === p ? 600 : 400, transition: 'all 0.15s', flexShrink: 0 }}>
            {p === 'hoje' ? 'Hoje' : p}
          </button>
        ))}
        <button onClick={() => { if (workspace?.id) { setRefreshing(true); load(workspace.id, period) } }}
          style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}/>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ height: 42, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 4, flexShrink: 0, background: 'rgba(8,8,14,0.6)', backdropFilter: 'blur(8px)', position: 'relative', zIndex: 9 }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as Tab)}
            style={{ height: 34, padding: '0 14px', borderRadius: 0, background: 'transparent', border: 'none', color: tab === key ? T.text : T.muted, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, borderBottom: `2px solid ${tab === key ? '#3b82f6' : 'transparent'}`, transition: 'all 0.15s', fontFamily: T.sans, fontWeight: tab === key ? 600 : 400 }}>
            <Icon size={13} style={{ color: tab === key ? '#60a5fa' : T.muted }}/>{label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      {!loading && rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          {[
            { label: 'Gasto total',   value: toBRL(totais.spend),   color: T.text },
            { label: 'Receita total', value: toBRL(totais.receita), color: T.green },
            { label: 'ROAS geral',    value: `${totais.roas.toFixed(2)}x`, color: totais.roas >= 1.5 ? T.green : T.red },
            { label: 'Conversões',    value: fmtNum(totais.conversions), color: T.text },
          ].map((k, i) => (
            <div key={k.label} style={{ padding: '10px 20px', borderRight: i < 3 ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4, fontFamily: T.display }}>{k.label}</div>
              <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 700, color: k.color, letterSpacing: '-0.02em' }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabela */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        {rows.length === 0 && !loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <AlertCircle size={32} style={{ color: T.muted }}/>
            <p style={{ fontSize: 13, color: T.muted, fontFamily: T.sans }}>
              {source === 'tiktok' ? 'Conecte uma BC em Integrações e sincronize.' : 'Conecte uma conta Meta em Integrações.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#', 'Nome', 'Score', 'Gasto', 'Receita', 'ROAS', 'Conv.', 'Impres.', 'CTR', 'CPM'].map((h, i) => (
                  <th key={h} style={{ padding: '8px 8px', textAlign: i <= 1 ? 'left' : i === 2 ? 'center' : 'right', fontSize: 10, color: T.muted, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', background: 'rgba(8,8,14,0.95)', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap', paddingLeft: i === 0 ? 16 : undefined, paddingRight: i === 9 ? 16 : undefined, fontFamily: T.display }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} style={{ padding: '12px 8px' }}>
                        <div style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.04)', animation: 'sk 1.4s ease-in-out infinite', backgroundSize: '200% 100%' }}/>
                      </td>
                    ))}
                  </tr>
                ))
                : rows.map((row, i) => <TableRow key={row.key} row={row} rank={i + 1}/>)
              }
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes sk   { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @media (max-width: 768px) {
          table th:nth-child(n+8), table td:nth-child(n+8) { display: none; }
        }
      `}</style>
    </div>
  )
}
