'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Link2, MousePointer, ShoppingCart, TrendingUp, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import { SpotlightCard } from '@/components/ui/aceternity'

type Period  = 'hoje' | '7d' | '30d'
type GroupBy = 'utm_source' | 'utm_campaign' | 'utm_medium'

const T = {
  bg: 'rgba(8,8,14,0.92)', border: 'rgba(255,255,255,0.055)',
  text: '#dcdcf0', sub: '#8a8aaa', muted: '#4a4a6a',
  green: '#10b981', amber: '#f59e0b', blue: '#3b82f6',
  mono: "'JetBrains Mono', monospace", sans: "'DM Sans', sans-serif", display: "'Syne', sans-serif",
}

const toBRL     = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const hoje      = () => new Date().toISOString().split('T')[0]
const diasAtras = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0] }
const decodeUtm = (s: string | null) => { try { return s ? decodeURIComponent(s) : null } catch { return s } }

const SOURCE_COLORS: Record<string, string> = {
  facebook: '#1877F2', fb: '#1877F2', instagram: '#E1306C',
  tiktok: '#60a5fa', google: '#4285F4', organic: '#64748B', whatsapp: '#25D366',
}
function getColor(key: string) { return SOURCE_COLORS[key.toLowerCase()] ?? '#60a5fa' }

export default function UTMsPage() {
  const { active: workspace } = useWorkspaceStore()
  const [period, setPeriod]     = useState<Period>('7d')
  const [groupBy, setGroupBy]   = useState<GroupBy>('utm_source')
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData]         = useState<any[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load(wid: string, p: Period) {
    setLoading(true)
    const diff = p === 'hoje' ? 1 : p === '7d' ? 7 : 30
    const from = p === 'hoje' ? hoje() : diasAtras(diff)
    const { data: convs } = await supabase.from('conversions').select('valor,status,utm_source,utm_campaign,utm_medium,utm_content,customer_name,created_at').eq('workspace_id', wid).gte('dia', from).lte('dia', hoje())
    setData(convs ?? [])
    setLoading(false); setRefreshing(false)
  }

  useEffect(() => { if (workspace?.id) load(workspace.id, period) }, [workspace?.id, period])

  const rows = useMemo(() => {
    const map: Record<string, { key: string; cliques: number; vendas: number; receita: number; pendentes: number }> = {}
    for (const r of data) {
      const raw = r[groupBy]
      const key = (groupBy === 'utm_campaign' ? decodeUtm(raw) : raw) ?? '(orgânico)'
      if (!map[key]) map[key] = { key, cliques: 0, vendas: 0, receita: 0, pendentes: 0 }
      map[key].cliques++
      if (r.status === 'paid')    { map[key].vendas++; map[key].receita += r.valor ?? 0 }
      if (r.status === 'pending') map[key].pendentes++
    }
    return Object.values(map)
      .filter(r => !search || r.key.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.receita - a.receita)
  }, [data, groupBy, search])

  const totais = {
    cliques: rows.reduce((s, r) => s + r.cliques, 0),
    vendas:  rows.reduce((s, r) => s + r.vendas, 0),
    receita: rows.reduce((s, r) => s + r.receita, 0),
  }
  const maxReceita = rows[0]?.receita ?? 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0b0f14', position: 'relative' }}>

      {/* Topbar */}
      <div style={{ height: 50, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 8, flexShrink: 0, background: 'rgba(8,8,14,0.88)', backdropFilter: 'blur(20px)', position: 'relative', zIndex: 10 }}>
        <Link2 size={14} style={{ color: '#a78bfa' }}/>
        <span style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: '-0.02em', fontFamily: T.display }}>UTMs</span>
        <div style={{ flex: 1 }}/>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
            style={{ height: 30, padding: '0 10px 0 28px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 11, outline: 'none', fontFamily: T.sans, width: 150 }}/>
        </div>
        {/* GroupBy */}
        <select value={groupBy} onChange={e => setGroupBy(e.target.value as GroupBy)}
          style={{ height: 30, padding: '0 8px', background: 'rgba(10,10,18,0.8)', border: `1px solid ${T.border}`, borderRadius: 8, color: T.sub, fontSize: 11, outline: 'none', cursor: 'pointer' }}>
          <option value="utm_source">Por Source</option>
          <option value="utm_campaign">Por Campanha</option>
          <option value="utm_medium">Por Medium</option>
        </select>
        {/* Período */}
        {(['hoje', '7d', '30d'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ height: 30, padding: '0 12px', borderRadius: 8, background: period === p ? 'rgba(59,130,246,0.12)' : 'transparent', border: `1px solid ${period === p ? 'rgba(59,130,246,0.3)' : T.border}`, color: period === p ? '#60a5fa' : T.muted, fontSize: 11, cursor: 'pointer', fontFamily: T.sans, fontWeight: period === p ? 600 : 400, transition: 'all 0.15s' }}>
            {p === 'hoje' ? 'Hoje' : p}
          </button>
        ))}
        <button onClick={() => { if (workspace?.id) { setRefreshing(true); load(workspace.id, period) } }}
          style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}/>
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        {[
          { l: 'Total de eventos',  v: String(totais.cliques), c: '#60a5fa', icon: MousePointer },
          { l: 'Vendas pagas',      v: String(totais.vendas),  c: T.green,   icon: ShoppingCart },
          { l: 'Receita atribuída', v: toBRL(totais.receita),  c: T.green,   icon: TrendingUp   },
        ].map(({ l, v, c, icon: Icon }, i) => (
          <div key={l} style={{ padding: '12px 20px', borderRight: i < 2 ? `1px solid ${T.border}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${c}12`, border: `1px solid ${c}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={14} style={{ color: c }}/>
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 2, fontFamily: T.display }}>{l}</div>
              <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 700, color: c, letterSpacing: '-0.02em' }}>{v}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', position: 'relative', zIndex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.03)', animation: 'sk 1.4s ease-in-out infinite', backgroundSize: '200% 100%' }}/>)}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10 }}>
            <Link2 size={32} style={{ color: T.muted }}/>
            <p style={{ fontSize: 13, color: T.muted, fontFamily: T.sans }}>Nenhum dado de UTM encontrado.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px', gap: 12, padding: '4px 16px 8px', marginBottom: 2 }}>
              {[groupBy === 'utm_source' ? 'Source' : groupBy === 'utm_campaign' ? 'Campanha' : 'Medium', 'Eventos', 'Vendas', 'Receita'].map((h, i) => (
                <div key={h} style={{ fontSize: 10, color: T.muted, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' as const, textAlign: i > 0 ? 'right' as const : 'left' as const, fontFamily: T.display }}>{h}</div>
              ))}
            </div>

            {rows.map((row, i) => {
              const color  = getColor(row.key)
              const pct    = maxReceita > 0 ? (row.receita / maxReceita) * 100 : 0
              const isOpen = expanded === row.key
              const rowData = data.filter(d => {
                const raw = d[groupBy]
                const k = (groupBy === 'utm_campaign' ? decodeUtm(raw) : raw) ?? '(orgânico)'
                return k === row.key && d.status === 'paid'
              }).slice(0, 5)

              return (
                <motion.div key={row.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }}>
                  <div onClick={() => setExpanded(isOpen ? null : row.key)}
                    style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${isOpen ? `${color}25` : T.border}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }}/>
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: T.sans }}>{row.key}</span>
                          {row.pendentes > 0 && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'rgba(245,158,11,0.1)', color: T.amber, fontFamily: T.mono, flexShrink: 0 }}>{row.pendentes} pend.</span>}
                        </div>
                        <div style={{ textAlign: 'right', fontFamily: T.mono, fontSize: 13, color: T.sub }}>{row.cliques}</div>
                        <div style={{ textAlign: 'right', fontFamily: T.mono, fontSize: 13, color: T.sub }}>{row.vendas}</div>
                        <div style={{ textAlign: 'right', fontFamily: T.display, fontSize: 14, fontWeight: 700, color: row.receita > 0 ? T.green : T.muted }}>{toBRL(row.receita)}</div>
                      </div>
                      <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.05 }}
                          style={{ height: '100%', background: color, borderRadius: 99, boxShadow: `0 0 6px ${color}60` }}/>
                      </div>
                    </div>
                    {isOpen && rowData.length > 0 && (
                      <div style={{ borderTop: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.015)' }}>
                        {rowData.map((d: any, j: number) => (
                          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: j < rowData.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none' }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.green, flexShrink: 0 }}/>
                            <span style={{ fontSize: 12, color: T.sub, flex: 1, fontFamily: T.sans }}>{d.customer_name ?? 'Cliente'}</span>
                            <span style={{ fontSize: 11, color: T.muted, fontFamily: T.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{decodeUtm(d.utm_campaign) ?? '—'}</span>
                            <span style={{ fontSize: 12, fontFamily: T.mono, fontWeight: 600, color: T.green, flexShrink: 0 }}>{toBRL(d.valor ?? 0)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes sk{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  )
}
