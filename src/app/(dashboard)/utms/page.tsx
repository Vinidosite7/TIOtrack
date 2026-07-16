'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Link2, MousePointer, ShoppingCart, TrendingUp, Search, Target, Radio, AlertCircle, ArrowRight } from 'lucide-react'
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
  const [isMobile, setIsMobile] = useState(false)
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
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 760)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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
  const topRow = rows[0]
  const conversionRate = totais.cliques > 0 ? Math.round((totais.vendas / totais.cliques) * 100) : 0
  const pendingTotal = rows.reduce((s, r) => s + r.pendentes, 0)
  const trackingLabel = groupBy === 'utm_source' ? 'origem' : groupBy === 'utm_campaign' ? 'campanha' : 'meio'
  const groupLabel = groupBy === 'utm_source' ? 'Source' : groupBy === 'utm_campaign' ? 'Campanha' : 'Medium'

  const UtmSignal = ({ icon: Icon, label, value, tone = '#60a5fa' }: { icon: any; label: string; value: string; tone?: string }) => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '11px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.035)', border: `1px solid ${T.border}`, minWidth: 0 }}>
      <div style={{ width: 30, height: 30, borderRadius: 10, background: `${tone}14`, border: `1px solid ${tone}24`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={14} style={{ color: tone }}/>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase' as const, letterSpacing: '0.07em', fontFamily: T.display, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: T.text, fontWeight: 700, fontFamily: T.sans, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0b0f14', position: 'relative' }}>

      {/* Topbar */}
      <div style={{ minHeight: isMobile ? 132 : 58, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: isMobile ? 'stretch' : 'center', padding: isMobile ? '14px 14px' : '0 20px', gap: 10, flexShrink: 0, background: 'rgba(8,8,14,0.88)', backdropFilter: 'blur(20px)', position: 'relative', zIndex: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: isMobile ? '100%' : 190 }}>
          <div style={{ width: 32, height: 32, borderRadius: 11, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Link2 size={15} style={{ color: '#a78bfa' }}/>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text, letterSpacing: '-0.02em', fontFamily: T.display }}>UTMs</div>
            <div style={{ fontSize: 10, color: T.muted, fontFamily: T.sans }}>de onde vem o caixa, sem adivinhar</div>
          </div>
        </div>
        <div style={{ flex: 1 }}/>
        {/* Search */}
        <div style={{ position: 'relative', width: isMobile ? '100%' : 178 }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
            style={{ height: 32, padding: '0 10px 0 28px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 11, outline: 'none', fontFamily: T.sans, width: '100%' }}/>
        </div>
        {/* GroupBy */}
        <select value={groupBy} onChange={e => setGroupBy(e.target.value as GroupBy)}
          style={{ height: 32, padding: '0 9px', background: 'rgba(10,10,18,0.8)', border: `1px solid ${T.border}`, borderRadius: 10, color: T.sub, fontSize: 11, outline: 'none', cursor: 'pointer', flex: isMobile ? 1 : 'initial' }}>
          <option value="utm_source">Por Source</option>
          <option value="utm_campaign">Por Campanha</option>
          <option value="utm_medium">Por Medium</option>
        </select>
        {/* Período */}
        {(['hoje', '7d', '30d'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ height: 32, padding: '0 12px', borderRadius: 10, background: period === p ? 'rgba(59,130,246,0.12)' : 'transparent', border: `1px solid ${period === p ? 'rgba(59,130,246,0.3)' : T.border}`, color: period === p ? '#60a5fa' : T.muted, fontSize: 11, cursor: 'pointer', fontFamily: T.sans, fontWeight: period === p ? 700 : 500, transition: 'all 0.15s' }}>
            {p === 'hoje' ? 'Hoje' : p}
          </button>
        ))}
        <button onClick={() => { if (workspace?.id) { setRefreshing(true); load(workspace.id, period) } }}
          style={{ width: 32, height: 32, borderRadius: 10, background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}/>
        </button>
      </div>

      {/* Executive read */}
      <div style={{ padding: isMobile ? '14px' : '16px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <SpotlightCard style={{ padding: isMobile ? 16 : 18, borderRadius: 18, background: 'linear-gradient(135deg, rgba(96,165,250,0.10), rgba(167,139,250,0.07) 45%, rgba(16,185,129,0.06))', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.05fr 1.4fr', gap: isMobile ? 14 : 18, alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 9px', borderRadius: 999, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.22)', color: '#93c5fd', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontFamily: T.display, marginBottom: 10 }}>
                <Radio size={12}/> mapa de atribuição
              </div>
              <div style={{ fontSize: isMobile ? 20 : 24, lineHeight: 1.02, color: T.text, fontWeight: 850, letterSpacing: '-0.04em', fontFamily: T.display, marginBottom: 7 }}>
                {topRow ? `${topRow.key} puxa ${toBRL(topRow.receita)}` : 'UTMs prontas para mostrar o caminho do dinheiro'}
              </div>
              <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.55, fontFamily: T.sans, maxWidth: 560 }}>
                Agrupe por source, campanha ou medium para descobrir qual {trackingLabel} realmente vira venda paga. Aqui a leitura é simples: evento capturado, venda confirmada e receita atribuída.
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,minmax(0,1fr))', gap: 10 }}>
              <UtmSignal icon={Target} label={`melhor ${trackingLabel}`} value={topRow?.key ?? 'sem dados'} tone="#a78bfa"/>
              <UtmSignal icon={ShoppingCart} label="taxa venda/evento" value={`${conversionRate}%`} tone={conversionRate > 0 ? T.green : '#60a5fa'}/>
              <UtmSignal icon={AlertCircle} label="pendências" value={pendingTotal > 0 ? `${pendingTotal} aguardando` : 'limpo'} tone={pendingTotal > 0 ? T.amber : T.green}/>
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        {[
          { l: 'Total de eventos',  v: String(totais.cliques), c: '#60a5fa', icon: MousePointer },
          { l: 'Vendas pagas',      v: String(totais.vendas),  c: T.green,   icon: ShoppingCart },
          { l: 'Receita atribuída', v: toBRL(totais.receita),  c: T.green,   icon: TrendingUp   },
        ].map(({ l, v, c, icon: Icon }, i) => (
          <div key={l} style={{ padding: isMobile ? '12px 14px' : '12px 20px', borderRight: !isMobile && i < 2 ? `1px solid ${T.border}` : 'none', borderBottom: isMobile && i < 2 ? `1px solid ${T.border}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
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
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px' : '16px 20px', position: 'relative', zIndex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.03)', animation: 'sk 1.4s ease-in-out infinite', backgroundSize: '200% 100%' }}/>)}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, textAlign: 'center', padding: 24 }}>
            <div style={{ width: 54, height: 54, borderRadius: 18, background: 'rgba(96,165,250,0.09)', border: '1px solid rgba(96,165,250,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Link2 size={24} style={{ color: '#60a5fa' }}/>
            </div>
            <div>
              <div style={{ fontSize: 16, color: T.text, fontWeight: 800, fontFamily: T.display, marginBottom: 5 }}>
                {search ? 'Nenhum UTM nesse filtro' : 'UTMs ainda sem dados'}
              </div>
              <p style={{ fontSize: 12, color: T.muted, fontFamily: T.sans, lineHeight: 1.5, maxWidth: 360, margin: 0 }}>
                {search ? 'Tenta outro termo ou limpe a busca para voltar ao mapa completo.' : 'Assim que as vendas entrarem com parâmetros de campanha, essa tela mostra qual origem está trazendo caixa.'}
              </p>
            </div>
            {search ? (
              <button onClick={() => setSearch('')} style={{ height: 34, padding: '0 13px', borderRadius: 10, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)', color: '#93c5fd', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Limpar busca
              </button>
            ) : (
              <button onClick={() => { window.location.href = '/integracoes' }} style={{ height: 34, padding: '0 13px', borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Ver integrações <ArrowRight size={13}/>
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Header */}
            {!isMobile && <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px', gap: 12, padding: '4px 16px 8px', marginBottom: 2 }}>
              {[groupLabel, 'Eventos', 'Vendas', 'Receita'].map((h, i) => (
                <div key={h} style={{ fontSize: 10, color: T.muted, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' as const, textAlign: i > 0 ? 'right' as const : 'left' as const, fontFamily: T.display }}>{h}</div>
              ))}
            </div>}

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
                    <div style={{ padding: isMobile ? '13px' : '12px 16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 80px 80px 100px', gap: isMobile ? 10 : 12, alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }}/>
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: T.sans }}>{row.key}</span>
                          {row.pendentes > 0 && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'rgba(245,158,11,0.1)', color: T.amber, fontFamily: T.mono, flexShrink: 0 }}>{row.pendentes} pend.</span>}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3,1fr)' : 'subgrid', gridColumn: isMobile ? 'auto' : 'span 3', gap: 12 }}>
                          <div style={{ textAlign: isMobile ? 'left' : 'right', fontFamily: T.mono, fontSize: 13, color: T.sub }}><span style={{ display: isMobile ? 'block' : 'none', fontSize: 9, color: T.muted, fontFamily: T.display, letterSpacing: '0.07em', textTransform: 'uppercase' as const }}>Eventos</span>{row.cliques}</div>
                          <div style={{ textAlign: isMobile ? 'left' : 'right', fontFamily: T.mono, fontSize: 13, color: T.sub }}><span style={{ display: isMobile ? 'block' : 'none', fontSize: 9, color: T.muted, fontFamily: T.display, letterSpacing: '0.07em', textTransform: 'uppercase' as const }}>Vendas</span>{row.vendas}</div>
                          <div style={{ textAlign: isMobile ? 'left' : 'right', fontFamily: T.display, fontSize: 14, fontWeight: 700, color: row.receita > 0 ? T.green : T.muted }}><span style={{ display: isMobile ? 'block' : 'none', fontSize: 9, color: T.muted, fontFamily: T.display, letterSpacing: '0.07em', textTransform: 'uppercase' as const }}>Receita</span>{toBRL(row.receita)}</div>
                        </div>
                      </div>
                      <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.05 }}
                          style={{ height: '100%', background: color, borderRadius: 99 }}/>
                      </div>
                    </div>
                    {isOpen && rowData.length > 0 && (
                      <div style={{ borderTop: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.015)' }}>
                        {rowData.map((d: any, j: number) => (
                          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '10px 13px' : '8px 16px', borderBottom: j < rowData.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.green, flexShrink: 0 }}/>
                            <span style={{ fontSize: 12, color: T.sub, flex: 1, fontFamily: T.sans }}>{d.customer_name ?? 'Cliente'}</span>
                            <span style={{ fontSize: 11, color: T.muted, fontFamily: T.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? '100%' : 180 }}>{decodeUtm(d.utm_campaign) ?? '—'}</span>
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
