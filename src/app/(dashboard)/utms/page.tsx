'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Link2, MousePointer, ShoppingCart, TrendingUp, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { T } from '@/lib/tokens'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import { GridBg, sharedStyles } from '@/components/ui/shared'

type Period  = 'hoje' | '7d' | '30d'
type GroupBy = 'utm_source' | 'utm_campaign' | 'utm_medium'

const toBRL     = (v: number) => v.toLocaleString('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits:0 })
const hoje      = () => new Date().toISOString().split('T')[0]
const diasAtras = (n: number) => { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0] }

const SOURCE_COLORS: Record<string,string> = {
  facebook:'#1877F2', fb:'#1877F2', instagram:'#E1306C',
  tiktok:'#ffffff', google:'#4285F4', organic:'#64748B', whatsapp:'#25D366',
}

function getColor(key: string) {
  return SOURCE_COLORS[key.toLowerCase()] ?? '#60A5FA'
}

export default function UTMsPage() {
  const { active: workspace } = useWorkspaceStore()
  const [period,setPeriod]   = useState<Period>('7d')
  const [groupBy,setGroupBy] = useState<GroupBy>('utm_source')
  const [search,setSearch]   = useState('')
  const [loading,setLoading] = useState(true)
  const [refreshing,setRefreshing] = useState(false)
  const [data,setData]       = useState<any[]>([])
  const [expanded,setExpanded] = useState<string|null>(null)

  async function load(wid: string, p: Period) {
    setLoading(true)
    const diff = p==='hoje'?1:p==='7d'?7:30
    const from = p==='hoje'?hoje():diasAtras(diff)

    const [{ data:convs }] = await Promise.all([
      supabase.from('conversions').select('valor,status,utm_source,utm_campaign,utm_medium,utm_content,customer_name,created_at').eq('workspace_id',wid).gte('dia',from).lte('dia',hoje()),
    ])

    setData(convs ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { if(workspace?.id) load(workspace.id, period) }, [workspace?.id, period])

  // Agrega por groupBy
  const rows = useMemo(() => {
    const map: Record<string,{ key:string; cliques:number; vendas:number; receita:number; pendentes:number }> = {}
    for (const r of data) {
      const key = r[groupBy] ?? '(orgânico)'
      if (!map[key]) map[key] = { key, cliques:0, vendas:0, receita:0, pendentes:0 }
      map[key].cliques++
      if (r.status==='paid')    { map[key].vendas++; map[key].receita+=r.valor??0 }
      if (r.status==='pending') map[key].pendentes++
    }
    return Object.values(map)
      .filter(r => !search || r.key.toLowerCase().includes(search.toLowerCase()))
      .sort((a,b) => b.receita-a.receita)
  }, [data, groupBy, search])

  const totais = {
    cliques: rows.reduce((s,r)=>s+r.cliques,0),
    vendas:  rows.reduce((s,r)=>s+r.vendas,0),
    receita: rows.reduce((s,r)=>s+r.receita,0),
  }
  const maxReceita = rows[0]?.receita ?? 1

  const GROUP_LABELS: Record<GroupBy,string> = {
    utm_source:   'Source',
    utm_campaign: 'Campanha',
    utm_medium:   'Medium',
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:'#070812', position:'relative' }}>
      <GridBg/>

      {/* Topbar */}
      <div style={{ height:50, borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', padding:'0 20px', gap:10, flexShrink:0, background:'rgba(7,8,18,0.92)', backdropFilter:'blur(16px)', position:'relative', zIndex:10 }}>
        <Link2 size={14} style={{ color:'#A78BFA' }}/>
        <span style={{ fontSize:14, fontWeight:700, color:'#F1F5F9', letterSpacing:'-0.02em' }}>UTMs</span>
        <div style={{ flex:1 }}/>

        {/* Search */}
        <div style={{ position:'relative' }}>
          <Search size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.2)' }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{ height:30, padding:'0 10px 0 28px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, color:'#E2E8F0', fontSize:11, outline:'none', fontFamily:'inherit', width:160 }}/>
        </div>

        {/* GroupBy */}
        <select value={groupBy} onChange={e=>setGroupBy(e.target.value as GroupBy)} style={{ height:30, padding:'0 8px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, color:'rgba(255,255,255,0.5)', fontSize:11, outline:'none', cursor:'pointer' }}>
          <option value="utm_source">Por Source</option>
          <option value="utm_campaign">Por Campanha</option>
          <option value="utm_medium">Por Medium</option>
        </select>

        {/* Período */}
        {(['hoje','7d','30d'] as Period[]).map(p=>(
          <button key={p} onClick={()=>setPeriod(p)} style={{ height:30, padding:'0 12px', borderRadius:8, background:period===p?'rgba(59,130,246,0.12)':'transparent', border:`1px solid ${period===p?'rgba(59,130,246,0.3)':'rgba(255,255,255,0.08)'}`, color:period===p?'#60A5FA':'rgba(255,255,255,0.4)', fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight:period===p?600:400, transition:'all 160ms' }}>
            {p==='hoje'?'Hoje':p}
          </button>
        ))}
        <button onClick={()=>{if(workspace?.id){setRefreshing(true);load(workspace.id,period)}}} style={{ width:30, height:30, borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <RefreshCw size={12} style={{ animation:refreshing?'spin 1s linear infinite':'none' }}/>
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
        {[
          { l:'Total de eventos', v:String(totais.cliques), c:'#60A5FA', icon:MousePointer },
          { l:'Vendas pagas',     v:String(totais.vendas),  c:'#34D399', icon:ShoppingCart },
          { l:'Receita atribuída',v:toBRL(totais.receita),  c:'#34D399', icon:TrendingUp   },
        ].map(({ l,v,c,icon:Icon },i)=>(
          <div key={l} style={{ padding:'12px 20px', borderRight:i<2?'1px solid rgba(255,255,255,0.06)':'none', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:`${c}12`, border:`1px solid ${c}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon size={14} style={{ color:c }}/>
            </div>
            <div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', textTransform:'uppercase' as const, letterSpacing:'0.06em', marginBottom:2 }}>{l}</div>
              <div style={{ fontFamily:'monospace', fontSize:18, fontWeight:700, color:c, letterSpacing:'-0.02em' }}>{v}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', position:'relative', zIndex:1 }}>
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[1,2,3,4].map(i=><div key={i} style={{ height:64, background:'linear-gradient(90deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.05) 50%,rgba(255,255,255,0.03) 100%)', backgroundSize:'200% 100%', borderRadius:12, animation:'sk 1.4s ease-in-out infinite' }}/>)}
          </div>
        ) : rows.length===0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:10 }}>
            <Link2 size={32} style={{ color:'rgba(255,255,255,0.1)' }}/>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.2)' }}>Nenhum dado de UTM encontrado.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {/* Header */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 100px', gap:12, padding:'6px 16px', marginBottom:4 }}>
              {[GROUP_LABELS[groupBy],'Eventos','Vendas','Receita'].map(h=>(
                <div key={h} style={{ fontSize:10, color:'rgba(255,255,255,0.2)', fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase' as const, textAlign:h!==GROUP_LABELS[groupBy]?'right' as const:'left' as const }}>{h}</div>
              ))}
            </div>

            {rows.map((row,i)=>{
              const color = getColor(row.key)
              const pct   = maxReceita>0?(row.receita/maxReceita)*100:0
              const isOpen = expanded===row.key
              const rowData = data.filter(d=>(d[groupBy]??'(orgânico)')===row.key && d.status==='paid').slice(0,5)

              return (
                <motion.div key={row.key} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3, delay:i*0.04, ease:[0.16,1,0.3,1] }}>
                  <div
                    onClick={()=>setExpanded(isOpen?null:row.key)}
                    style={{ background:'rgba(255,255,255,0.025)', border:`1px solid ${isOpen?`${color}25`:'rgba(255,255,255,0.07)'}`, borderRadius:12, overflow:'hidden', cursor:'pointer', transition:'border-color 160ms' }}
                  >
                    <div style={{ padding:'12px 16px' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 100px', gap:12, alignItems:'center', marginBottom:8 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:color, boxShadow:`0 0 6px ${color}`, flexShrink:0 }}/>
                          <span style={{ fontSize:13, fontWeight:600, color:'#E2E8F0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.key}</span>
                          {row.pendentes>0 && <span style={{ fontSize:9, padding:'1px 6px', borderRadius:20, background:'rgba(245,158,11,0.1)', color:'#FBBF24', fontFamily:'monospace', flexShrink:0 }}>{row.pendentes} pend.</span>}
                        </div>
                        <div style={{ textAlign:'right', fontFamily:'monospace', fontSize:13, color:'rgba(255,255,255,0.5)' }}>{row.cliques}</div>
                        <div style={{ textAlign:'right', fontFamily:'monospace', fontSize:13, color:'rgba(255,255,255,0.5)' }}>{row.vendas}</div>
                        <div style={{ textAlign:'right', fontFamily:'monospace', fontSize:14, fontWeight:700, color:row.receita>0?'#34D399':'rgba(255,255,255,0.3)' }}>{toBRL(row.receita)}</div>
                      </div>
                      {/* Barra */}
                      <div style={{ height:3, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden' }}>
                        <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.6, delay:i*0.05, ease:[0.16,1,0.3,1] }} style={{ height:'100%', background:color, borderRadius:99, boxShadow:`0 0 6px ${color}60` }}/>
                      </div>
                    </div>

                    {/* Expandido */}
                    {isOpen && rowData.length>0 && (
                      <div style={{ borderTop:'1px solid rgba(255,255,255,0.05)', background:'rgba(255,255,255,0.015)' }}>
                        {rowData.map((d:any,j:number)=>(
                          <div key={j} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px', borderBottom:j<rowData.length-1?'1px solid rgba(255,255,255,0.04)':'none' }}>
                            <div style={{ width:5, height:5, borderRadius:'50%', background:'#34D399', flexShrink:0 }}/>
                            <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)', flex:1 }}>{d.customer_name??'Cliente'}</span>
                            <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)', fontFamily:'monospace' }}>{d.utm_campaign??'—'}</span>
                            <span style={{ fontSize:12, fontFamily:'monospace', fontWeight:600, color:'#34D399' }}>{toBRL(d.valor??0)}</span>
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

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes sk{0%{background-position:200% 0}100%{background-position:-200% 0}}${sharedStyles}`}</style>
    </div>
  )
}
