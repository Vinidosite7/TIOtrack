'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe2, Send, MessageCircle, ShoppingBag, Zap, ArrowRight, ArrowLeft, CheckCircle2, Bot, Link2, RadioTower } from 'lucide-react'
import { useWorkspaceStore } from '@/store/workspace'
import { H, PageHeader, Panel } from '@/components/hawk/ui'

type FunnelType = 'site'|'site_telegram'|'telegram'|'site_whatsapp'|'whatsapp'|'ecommerce'|'custom'

const OPTIONS: { type: FunnelType; title: string; sub: string; icon: any; recommended?: boolean }[] = [
  { type: 'site', title: 'Site', sub: 'Página de vendas com checkout direto', icon: Globe2 },
  { type: 'site_telegram', title: 'Site → Telegram', sub: 'Presell que envia o lead para o Telegram', icon: Send, recommended: true },
  { type: 'telegram', title: 'Telegram', sub: 'Entrada direta no bot, sem página', icon: Bot },
  { type: 'site_whatsapp', title: 'Site → WhatsApp', sub: 'Página que envia o lead ao WhatsApp', icon: MessageCircle },
  { type: 'whatsapp', title: 'WhatsApp', sub: 'Venda direta pelo WhatsApp', icon: MessageCircle },
  { type: 'ecommerce', title: 'E-commerce', sub: 'Loja ou checkout integrado', icon: ShoppingBag },
  { type: 'custom', title: 'Personalizado', sub: 'Monte sua própria jornada', icon: Zap },
]

export default function NovoProdutoPage() {
  const router = useRouter()
  const { active } = useWorkspaceStore()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pages, setPages] = useState<any[]>([])
  const [form, setForm] = useState<any>({
    name: '', price: '', currency: 'BRL', funnel_type: 'site_telegram',
    page_mode: 'tiotrack', page_id: '', page_url: '', telegram_provider: 'sharkbot', bot_id: '', whatsapp_phone: '',
    tracking_tiktok: true, tracking_meta: false, tracking_google: false, tracking_kwai: false,
  })

  useEffect(() => {
    if (!active?.id) return
    fetch(`/api/pages?workspace_id=${encodeURIComponent(active.id)}`, { cache: 'no-store' })
      .then(r => r.json()).then(j => {
        const list = j.pages || []; setPages(list)
        if (!form.page_id && list[0]) setForm((f:any) => ({ ...f, page_id: list[0].id }))
      }).catch(() => {})
  }, [active?.id])

  const selected = OPTIONS.find(o => o.type === form.funnel_type)!
  const needsSite = ['site','site_telegram','site_whatsapp','ecommerce'].includes(form.funnel_type)
  const needsTelegram = ['site_telegram','telegram'].includes(form.funnel_type)
  const needsWhatsapp = ['site_whatsapp','whatsapp'].includes(form.funnel_type)

  const canNext = useMemo(() => {
    if (step === 1) return Boolean(form.name.trim() && form.funnel_type)
    if (step === 2) {
      if (needsSite && form.page_mode === 'tiotrack' && !form.page_id) return false
      if (needsSite && form.page_mode === 'external' && !form.page_url.trim()) return false
      if (needsTelegram && !form.telegram_provider) return false
      if (needsWhatsapp && !form.whatsapp_phone.trim()) return false
    }
    return true
  }, [step, form, needsSite, needsTelegram, needsWhatsapp])

  async function create() {
    if (!active?.id) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: active.id,
          name: form.name,
          price: form.price || null,
          currency: form.currency,
          funnel_type: form.funnel_type,
          page_id: needsSite && form.page_mode === 'tiotrack' ? form.page_id : null,
          entry: needsSite ? (form.page_mode === 'tiotrack' ? { type: 'tiotrack_page', page_id: form.page_id } : { type: 'external_url', url: form.page_url }) : { type: form.funnel_type },
          destination: needsTelegram ? { type: 'telegram' } : needsWhatsapp ? { type: 'whatsapp' } : { type: 'checkout' },
          integration: {
            telegram_provider: needsTelegram ? form.telegram_provider : null,
            bot_id: needsTelegram ? (form.bot_id || null) : null,
            whatsapp_phone: needsWhatsapp ? form.whatsapp_phone : null,
          },
          tracking: {
            destinations: [
              form.tracking_tiktok && 'tiktok',
              form.tracking_meta && 'meta',
              form.tracking_google && 'google',
              form.tracking_kwai && 'kwai',
            ].filter(Boolean),
          },
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha ao criar produto')
      router.push(`/produtos/${json.product.id}`)
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro inesperado') }
    finally { setSaving(false) }
  }

  return (
    <div className="shell-page">
      <PageHeader title="Novo produto" sub="Produto, funil, integração e tracking em um único fluxo." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, marginBottom: 14 }}>
        {['Produto / Funil','Integração','Tracking','Revisar'].map((label,i) => {
          const n=i+1, on=n===step, done=n<step
          return <div key={label} className="tt-inset" style={{ padding: 12, borderColor: on ? 'rgba(163,167,242,.35)' : undefined }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:24,height:24,borderRadius:99,display:'grid',placeItems:'center',background: done||on ? 'rgba(163,167,242,.18)' : 'rgba(255,255,255,.03)',color:done||on?H.lavLight:H.muted,fontWeight:800,fontSize:11 }}>{done?<CheckCircle2 size={13}/>:n}</div>
              <span style={{ color:on?H.text:H.sub,fontWeight:on?700:500,fontSize:12 }}>{label}</span>
            </div>
          </div>
        })}
      </div>

      <Panel style={{ padding: 20 }}>
        {step === 1 && <>
          <h2 className="tt-h">Informações do produto</h2>
          <p className="tt-cap" style={{ marginTop:4 }}>Dê um nome e escolha como essa oferta funciona.</p>
          <div style={{ marginTop:18 }}><label className="tt-cap">Nome do produto</label><input className="tt-input" style={{ marginTop:8 }} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex.: Detox 72h" /></div>
          <div style={{ marginTop:16, display:'grid',gridTemplateColumns:'1fr 180px',gap:12 }}>
            <div><label className="tt-cap">Preço</label><input className="tt-input" style={{ marginTop:8 }} type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="19,90" /></div>
            <div><label className="tt-cap">Moeda</label><select className="tt-select" style={{ marginTop:8 }} value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}><option>BRL</option><option>USD</option><option>EUR</option></select></div>
          </div>
          <div style={{ marginTop:20 }}><div className="tt-cap">Tipo de funil</div>
            <div className="tt-grid-fluid" style={{ marginTop:10 }}>
              {OPTIONS.map(o=>{ const Icon=o.icon,on=form.funnel_type===o.type; return <button key={o.type} onClick={()=>setForm({...form,funnel_type:o.type})} style={{ textAlign:'left',padding:15,borderRadius:14,border:`1px solid ${on?'rgba(163,167,242,.4)':H.line}`,background:on?'rgba(163,167,242,.09)':'rgba(255,255,255,.02)',position:'relative' }}>
                {o.recommended&&<span style={{ position:'absolute',right:10,top:10,fontSize:9,fontWeight:800,color:H.green }}>RECOMENDADO</span>}
                <Icon size={21} color={on?H.lavLight:H.sub}/><div style={{ marginTop:10,color:H.text,fontWeight:800 }}>{o.title}</div><div className="tt-cap" style={{ marginTop:4,lineHeight:1.5 }}>{o.sub}</div>
              </button>})}
            </div>
          </div>
        </>}

        {step === 2 && <>
          <h2 className="tt-h">Integração do funil</h2><p className="tt-cap" style={{marginTop:4}}>Configure só o que esse tipo de funil precisa.</p>
          {needsSite && <div style={{marginTop:18}}><label className="tt-cap">Página / origem</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
              <button onClick={()=>setForm({...form,page_mode:'tiotrack'})} className="tt-inset" style={{padding:13,textAlign:'left',borderColor:form.page_mode==='tiotrack'?'rgba(163,167,242,.4)':undefined}}><Globe2 size={16} color={form.page_mode==='tiotrack'?H.lavLight:H.sub}/><div style={{color:H.text,fontWeight:800,marginTop:7}}>Tiotrack Page</div><div className="tt-cap" style={{marginTop:3}}>Hospedada e versionada aqui</div></button>
              <button onClick={()=>setForm({...form,page_mode:'external'})} className="tt-inset" style={{padding:13,textAlign:'left',borderColor:form.page_mode==='external'?'rgba(163,167,242,.4)':undefined}}><Link2 size={16} color={form.page_mode==='external'?H.lavLight:H.sub}/><div style={{color:H.text,fontWeight:800,marginTop:7}}>URL externa</div><div className="tt-cap" style={{marginTop:3}}>Vercel, Hostinger, outro host</div></button>
            </div>
            {form.page_mode==='tiotrack'?<><select className="tt-select" style={{marginTop:10}} value={form.page_id} onChange={e=>setForm({...form,page_id:e.target.value})}><option value="">Selecione uma Page...</option>{pages.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>{pages.length===0&&<div className="tt-cap" style={{marginTop:6,color:H.amber}}>Crie uma Page em Pages antes de continuar.</div>}</>:<div style={{display:'flex',alignItems:'center',gap:8,marginTop:10}}><Link2 size={16} color={H.lav}/><input className="tt-input" value={form.page_url} onChange={e=>setForm({...form,page_url:e.target.value})} placeholder="https://sua-presell.com" /></div>}
          </div>}
          {needsTelegram && <div style={{marginTop:18}}><label className="tt-cap">Provider do Telegram</label><select className="tt-select" style={{marginTop:8}} value={form.telegram_provider} onChange={e=>setForm({...form,telegram_provider:e.target.value})}><option value="sharkbot">SharkBot</option><option value="external">Telegram externo</option><option value="tiotrack">Tiotrack Bot (futuro)</option></select><label className="tt-cap" style={{display:'block',marginTop:14}}>Bot / identificador</label><input className="tt-input" style={{marginTop:8}} value={form.bot_id} onChange={e=>setForm({...form,bot_id:e.target.value})} placeholder="Opcional por enquanto" /></div>}
          {needsWhatsapp && <div style={{marginTop:18}}><label className="tt-cap">WhatsApp</label><input className="tt-input" style={{marginTop:8}} value={form.whatsapp_phone} onChange={e=>setForm({...form,whatsapp_phone:e.target.value})} placeholder="5518999999999" /></div>}
          {!needsSite&&!needsTelegram&&!needsWhatsapp&&<div className="tt-inset" style={{padding:16,marginTop:18,color:H.sub}}>Esse funil será configurado pelos próximos módulos de integração.</div>}
        </>}

        {step === 3 && <>
          <h2 className="tt-h">Tracking & Signals</h2><p className="tt-cap" style={{marginTop:4}}>Escolha para quais redes o Tiotrack deve preparar os sinais desse funil.</p>
          <div style={{display:'grid',gap:10,marginTop:18}}>
            {[
              ['tracking_tiktok','TikTok','Pixel + Events API'],['tracking_meta','Meta','Pixel + CAPI'],['tracking_google','Google','Ads / conversions'],['tracking_kwai','Kwai','Pixel + Event API']
            ].map(([key,label,sub])=><button key={key} onClick={()=>setForm({...form,[key]:!form[key]})} className="tt-inset" style={{padding:14,display:'flex',alignItems:'center',justifyContent:'space-between',textAlign:'left',borderColor:form[key]?'rgba(116,211,171,.28)':undefined}}><div><div style={{color:H.text,fontWeight:800}}>{label}</div><div className="tt-cap" style={{marginTop:3}}>{sub}</div></div><div style={{width:34,height:20,borderRadius:99,padding:2,background:form[key]?'#8c91ea':'rgba(163,167,242,.12)'}}><div style={{width:14,height:14,borderRadius:99,background:form[key]?'#11142a':H.muted,transform:`translateX(${form[key]?14:0}px)`}}/></div></button>)}
          </div>
          <div className="tt-inset" style={{padding:14,marginTop:16}}><RadioTower size={16} color={H.lav}/><div style={{marginTop:8,color:H.text,fontWeight:700}}>Identity Engine automático</div><div className="tt-cap" style={{marginTop:4}}>visitor_id · session_id · click_id · lead_id · UTMs · ttclid/fbclid/gclid</div></div>
        </>}

        {step === 4 && <>
          <h2 className="tt-h">Revisar</h2><p className="tt-cap" style={{marginTop:4}}>Confirme a estrutura antes de criar.</p>
          <div style={{display:'grid',gap:10,marginTop:18}}>
            {[['Produto',form.name],['Funil',selected.title],['Preço',form.price?`${form.currency} ${form.price}`:'Não informado'],['Entrada',needsSite?(form.page_mode==='tiotrack'?(pages.find(p=>p.id===form.page_id)?.name||'Tiotrack Page'):form.page_url):form.funnel_type],['Destino',needsTelegram?'Telegram':needsWhatsapp?'WhatsApp':'Checkout'],['Signals',[form.tracking_tiktok&&'TikTok',form.tracking_meta&&'Meta',form.tracking_google&&'Google',form.tracking_kwai&&'Kwai'].filter(Boolean).join(', ')||'Nenhum']].map(([a,b])=><div key={a} className="tt-inset" style={{padding:12,display:'flex',justifyContent:'space-between',gap:12}}><span className="tt-cap">{a}</span><strong style={{color:H.text,textAlign:'right'}}>{b}</strong></div>)}
          </div>
          {error&&<div style={{marginTop:14,color:H.red,fontSize:12}}>{error}</div>}
        </>}

        <div style={{marginTop:22,paddingTop:16,borderTop:`1px solid ${H.line}`,display:'flex',justifyContent:'space-between',gap:10}}>
          <button className="tt-btn" disabled={step===1||saving} onClick={()=>setStep(s=>Math.max(1,s-1))}><ArrowLeft size={14}/> Voltar</button>
          {step<4?<button className="tt-btn tt-btn-primary" disabled={!canNext} onClick={()=>setStep(s=>Math.min(4,s+1))}>Próximo <ArrowRight size={14}/></button>:<button className="tt-btn tt-btn-primary" disabled={saving} onClick={create}>{saving?'Criando...':'Criar produto'} <CheckCircle2 size={14}/></button>}
        </div>
      </Panel>
    </div>
  )
}
