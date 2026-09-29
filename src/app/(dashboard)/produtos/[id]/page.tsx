'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Globe2, Send, MessageCircle, ShoppingBag, Zap, RadioTower, Route, Package, Activity, Pencil, Trash2, Save, X, Link2 } from 'lucide-react'
import { H, PageHeader, Panel, StatusPill, brl } from '@/components/hawk/ui'

const LABEL: Record<string,string> = { site:'Site',site_telegram:'Site → Telegram',telegram:'Telegram',site_whatsapp:'Site → WhatsApp',whatsapp:'WhatsApp',ecommerce:'E-commerce',custom:'Personalizado' }
const ICON: Record<string,any> = { site:Globe2,site_telegram:Send,telegram:Send,site_whatsapp:MessageCircle,whatsapp:MessageCircle,ecommerce:ShoppingBag,custom:Zap }

export default function ProductDetail() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pages, setPages] = useState<any[]>([])
  const [autoEditHandled, setAutoEditHandled] = useState(false)
  const [form, setForm] = useState<any>({})

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/products/${id}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Produto não encontrado')
      setProduct(json.product)
    } catch (e) { setError(e instanceof Error ? e.message : 'Produto não encontrado') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const funnel = product?.funnels?.[0]
  const steps = useMemo(() => [...(funnel?.funnel_steps || [])].sort((a,b)=>a.step_order-b.step_order), [funnel])
  const Icon = ICON[funnel?.funnel_type] || Package
  const destinations = funnel?.config?.tracking?.destinations || []
  const needsSite = ['site','site_telegram','site_whatsapp','ecommerce'].includes(funnel?.funnel_type)

  async function loadPages(workspaceId: string) {
    if (!workspaceId) return
    try {
      const res = await fetch(`/api/pages?workspace_id=${encodeURIComponent(workspaceId)}`, { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) setPages(json.pages || [])
    } catch {}
  }

  function openEdit(target = product) {
    if (!target) return
    const f = target.funnels?.[0]
    const entry = f?.config?.entry || {}
    const dests: string[] = f?.config?.tracking?.destinations || []
    const webStep = (f?.funnel_steps || []).find((s:any)=>s.channel === 'web')
    setForm({
      name: target.name || '',
      price: target.price_cents == null ? '' : String(target.price_cents / 100),
      status: target.status || 'active',
      page_mode: entry.type === 'external_url' ? 'external' : 'tiotrack',
      page_id: entry.page_id || webStep?.page_id || '',
      page_url: entry.url || '',
      tracking_tiktok: dests.includes('tiktok'),
      tracking_meta: dests.includes('meta'),
      tracking_google: dests.includes('google'),
      tracking_kwai: dests.includes('kwai'),
    })
    setEditing(true)
    loadPages(target.workspace_id)
  }

  useEffect(() => {
    if (!product || autoEditHandled || typeof window === 'undefined') return
    setAutoEditHandled(true)
    if (new URLSearchParams(window.location.search).get('edit') === '1') openEdit(product)
  }, [product, autoEditHandled])

  async function save() {
    if (!product || saving) return
    setSaving(true); setError('')
    try {
      const tracking = {
        destinations: [
          form.tracking_tiktok && 'tiktok',
          form.tracking_meta && 'meta',
          form.tracking_google && 'google',
          form.tracking_kwai && 'kwai',
        ].filter(Boolean),
      }
      const body: any = { name: form.name, price: form.price, status: form.status, tracking }
      if (needsSite) {
        body.page_mode = form.page_mode
        body.page_id = form.page_mode === 'tiotrack' ? form.page_id : null
        body.page_url = form.page_mode === 'external' ? form.page_url : null
      }
      const res = await fetch(`/api/products/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha ao atualizar produto')
      setProduct(json.product)
      setEditing(false)
      router.replace(`/produtos/${id}`)
      router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao atualizar produto') }
    finally { setSaving(false) }
  }

  async function remove() {
    if (!product || deleting) return
    if (!confirm(`Excluir o produto "${product.name}"? Os funis e etapas desse produto também serão removidos.`)) return
    setDeleting(true); setError('')
    try {
      const res = await fetch(`/api/products/${id}`, { method:'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Falha ao excluir produto')
      router.push('/produtos')
      router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao excluir produto'); setDeleting(false) }
  }

  if (loading) return <div className="shell-page"><Panel style={{padding:40,textAlign:'center',color:H.muted}}>Carregando produto...</Panel></div>
  if (error && !product) return <div className="shell-page"><Panel style={{padding:40,textAlign:'center',color:H.red}}>{error}</Panel></div>
  if (!product) return <div className="shell-page"><Panel style={{padding:40,textAlign:'center',color:H.red}}>Produto não encontrado</Panel></div>

  return (
    <div className="shell-page">
      <PageHeader
        title={product.name}
        sub={`${LABEL[funnel?.funnel_type] || 'Funil'} · ${product.slug}`}
        eyebrow={<Link href="/produtos" style={{display:'inline-flex',alignItems:'center',gap:5,color:H.sub}}><ArrowLeft size={12}/> Produtos</Link>}
        right={<div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap'}}>
          {!editing && <button className="tt-btn" onClick={()=>openEdit()}><Pencil size={14}/> Editar</button>}
          <button className="tt-btn" disabled={deleting} onClick={remove} style={{color:H.red,borderColor:'rgba(240,137,155,.22)'}}><Trash2 size={14}/> {deleting?'Excluindo...':'Excluir'}</button>
          <StatusPill tone={product.status==='active'?'good':product.status==='paused'?'warn':'neutral'}>{product.status}</StatusPill>
        </div>}
      />

      {error && <Panel style={{padding:14,marginBottom:14,borderColor:'rgba(240,137,155,.25)'}}><div style={{color:H.red,fontSize:12}}>{error}</div></Panel>}

      {editing && <Panel style={{padding:18,marginBottom:14,borderColor:'rgba(163,167,242,.28)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}><div><h2 className="tt-h">Editar produto</h2><div className="tt-cap" style={{marginTop:3}}>A troca de presell atualiza o funil e a etapa web imediatamente.</div></div><button className="tt-icon-btn" onClick={()=>setEditing(false)}><X size={14}/></button></div>
        <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 180px 180px',gap:10,marginTop:16}}>
          <div><label className="tt-cap">Nome</label><input className="tt-input" style={{marginTop:7}} value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></div>
          <div><label className="tt-cap">Preço</label><input className="tt-input" style={{marginTop:7}} type="number" min="0" step="0.01" value={form.price??''} onChange={e=>setForm({...form,price:e.target.value})}/></div>
          <div><label className="tt-cap">Status</label><select className="tt-select" style={{marginTop:7}} value={form.status||'active'} onChange={e=>setForm({...form,status:e.target.value})}><option value="active">Ativo</option><option value="paused">Pausado</option><option value="draft">Rascunho</option><option value="archived">Arquivado</option></select></div>
        </div>

        {needsSite && <div style={{marginTop:16}}><label className="tt-cap">Presell / entrada</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
            <button onClick={()=>setForm({...form,page_mode:'tiotrack'})} className="tt-inset" style={{padding:12,textAlign:'left',borderColor:form.page_mode==='tiotrack'?'rgba(163,167,242,.4)':undefined}}><Globe2 size={15} color={form.page_mode==='tiotrack'?H.lavLight:H.sub}/><div style={{color:H.text,fontWeight:800,marginTop:6}}>Tiotrack Page</div></button>
            <button onClick={()=>setForm({...form,page_mode:'external'})} className="tt-inset" style={{padding:12,textAlign:'left',borderColor:form.page_mode==='external'?'rgba(163,167,242,.4)':undefined}}><Link2 size={15} color={form.page_mode==='external'?H.lavLight:H.sub}/><div style={{color:H.text,fontWeight:800,marginTop:6}}>URL externa</div></button>
          </div>
          {form.page_mode==='tiotrack' ? <select className="tt-select" style={{marginTop:9}} value={form.page_id||''} onChange={e=>setForm({...form,page_id:e.target.value})}><option value="">Selecione uma Page...</option>{pages.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select> : <input className="tt-input" style={{marginTop:9}} value={form.page_url||''} onChange={e=>setForm({...form,page_url:e.target.value})} placeholder="https://sua-presell.com"/>}
        </div>}

        <div style={{marginTop:16}}><label className="tt-cap">Signals</label><div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8,marginTop:8}}>
          {[['TikTok','tracking_tiktok'],['Meta','tracking_meta'],['Google','tracking_google'],['Kwai','tracking_kwai']].map(([label,key])=><button key={key} onClick={()=>setForm({...form,[key]:!form[key]})} className="tt-inset" style={{padding:11,display:'flex',justifyContent:'space-between',alignItems:'center',borderColor:form[key]?'rgba(163,167,242,.4)':undefined}}><span style={{color:H.text,fontWeight:700,fontSize:12}}>{label}</span><span style={{width:9,height:9,borderRadius:99,background:form[key]?H.green:H.muted}}/></button>)}
        </div></div>

        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:18,paddingTop:14,borderTop:`1px solid ${H.line}`}}><button className="tt-btn" disabled={saving} onClick={()=>setEditing(false)}>Cancelar</button><button className="tt-btn tt-btn-primary" disabled={saving||!String(form.name||'').trim()||(needsSite&&form.page_mode==='tiotrack'&&!form.page_id)||(needsSite&&form.page_mode==='external'&&!String(form.page_url||'').trim())} onClick={save}><Save size={14}/>{saving?'Salvando...':'Salvar alterações'}</button></div>
      </Panel>}

      <div className="tt-grid-4" style={{marginBottom:14}}>
        <Panel style={{padding:15}}><div className="tt-cap">Preço</div><div className="tt-num" style={{fontSize:24,marginTop:6}}>{product.price_cents==null?'—':brl(product.price_cents/100,2)}</div></Panel>
        <Panel style={{padding:15}}><div className="tt-cap">Funis</div><div className="tt-num" style={{fontSize:24,marginTop:6}}>{product.funnels?.length||0}</div></Panel>
        <Panel style={{padding:15}}><div className="tt-cap">Etapas</div><div className="tt-num" style={{fontSize:24,marginTop:6}}>{steps.length}</div></Panel>
        <Panel style={{padding:15}}><div className="tt-cap">Signals</div><div className="tt-num" style={{fontSize:24,marginTop:6}}>{destinations.length}</div></Panel>
      </div>

      <div className="tt-grid-2">
        <Panel style={{padding:18}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:40,height:40,borderRadius:12,display:'grid',placeItems:'center',background:'rgba(163,167,242,.12)',border:`1px solid ${H.line}`}}><Icon size={18} color={H.lavLight}/></div><div><h2 className="tt-h">Jornada principal</h2><div className="tt-cap" style={{marginTop:3}}>{LABEL[funnel?.funnel_type]}</div></div></div>
          <div style={{marginTop:18,display:'grid',gap:8}}>
            {steps.map((step:any,index:number)=><div key={step.id||step.step_key} className="tt-inset" style={{padding:12,display:'grid',gridTemplateColumns:'34px 1fr auto',alignItems:'center',gap:10}}><div style={{width:28,height:28,borderRadius:99,display:'grid',placeItems:'center',background:'rgba(163,167,242,.15)',color:H.lavLight,fontWeight:800,fontSize:11}}>{index+1}</div><div><div style={{color:H.text,fontWeight:700}}>{step.name}</div><div className="tt-cap" style={{marginTop:2}}>{step.channel} · {step.step_key}</div></div><Route size={15} color={H.muted}/></div>)}
          </div>
        </Panel>

        <div style={{display:'grid',gap:14}}>
          <Panel style={{padding:18}}><div style={{display:'flex',alignItems:'center',gap:8}}><RadioTower size={16} color={H.lav}/><h2 className="tt-h">Tracking & Signals</h2></div><div style={{marginTop:14,display:'flex',gap:8,flexWrap:'wrap'}}>{destinations.length?destinations.map((d:string)=><span key={d} className="tt-badge">{d}</span>):<span className="tt-cap">Nenhum destino configurado.</span>}</div><div className="tt-inset" style={{padding:12,marginTop:14}}><div style={{color:H.text,fontWeight:700}}>Identity Engine</div><div className="tt-cap" style={{marginTop:3}}>visitor_id · session_id · click_id · lead_id</div></div></Panel>
          <Panel style={{padding:18}}><div style={{display:'flex',alignItems:'center',gap:8}}><Activity size={16} color={H.green}/><h2 className="tt-h">Configuração</h2></div><pre style={{marginTop:12,padding:12,borderRadius:12,background:'rgba(0,0,0,.2)',border:`1px solid ${H.line}`,color:H.sub,fontSize:11,overflow:'auto',whiteSpace:'pre-wrap'}}>{JSON.stringify(funnel?.config||{},null,2)}</pre></Panel>
        </div>
      </div>
    </div>
  )
}
