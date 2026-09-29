'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Package, Plus, Globe2, Send, MessageCircle, ShoppingBag, Zap, ArrowUpRight, Pencil, Trash2 } from 'lucide-react'
import { useWorkspaceStore } from '@/store/workspace'
import { H, PageHeader, Panel, StatusPill, brl } from '@/components/hawk/ui'

const TYPE_LABEL: Record<string, string> = {
  site: 'Site',
  site_telegram: 'Site → Telegram',
  telegram: 'Telegram',
  site_whatsapp: 'Site → WhatsApp',
  whatsapp: 'WhatsApp',
  ecommerce: 'E-commerce',
  custom: 'Personalizado',
}

const TYPE_ICON: Record<string, any> = {
  site: Globe2,
  site_telegram: Send,
  telegram: Send,
  site_whatsapp: MessageCircle,
  whatsapp: MessageCircle,
  ecommerce: ShoppingBag,
  custom: Zap,
}

export default function ProdutosPage() {
  const { active } = useWorkspaceStore()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState('')
  const [error, setError] = useState('')

  async function load() {
    if (!active?.id) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/products?workspace_id=${encodeURIComponent(active.id)}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha ao carregar produtos')
      setProducts(json.products || [])
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao carregar produtos') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [active?.id])

  async function remove(product: any) {
    if (deletingId) return
    if (!confirm(`Excluir o produto "${product.name}"? Os funis e etapas desse produto também serão removidos.`)) return
    setDeletingId(product.id); setError('')
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Falha ao excluir produto')
      setProducts(list => list.filter(p => p.id !== product.id))
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao excluir produto') }
    finally { setDeletingId('') }
  }

  const totals = useMemo(() => ({
    active: products.filter(p => p.status === 'active').length,
    funnels: products.reduce((n, p) => n + (p.funnels?.length || 0), 0),
  }), [products])

  return (
    <div className="shell-page">
      <PageHeader title="Produtos" sub="Produto, funil, canais e tracking ligados no mesmo lugar." right={
        <Link href="/produtos/novo" className="tt-btn tt-btn-primary"><Plus size={14} /> Novo produto</Link>
      } />

      {error && <Panel style={{padding:14,marginBottom:14,borderColor:'rgba(240,137,155,.25)'}}><div style={{color:H.red,fontSize:12}}>{error}</div></Panel>}

      <div className="tt-grid-3" style={{ marginBottom: 14 }}>
        <Panel style={{ padding: 16 }}><div className="tt-cap">Produtos</div><div className="tt-num" style={{ fontSize: 28, marginTop: 6 }}>{loading ? '—' : products.length}</div></Panel>
        <Panel style={{ padding: 16 }}><div className="tt-cap">Ativos</div><div className="tt-num" style={{ fontSize: 28, marginTop: 6, color: H.green }}>{loading ? '—' : totals.active}</div></Panel>
        <Panel style={{ padding: 16 }}><div className="tt-cap">Funis</div><div className="tt-num" style={{ fontSize: 28, marginTop: 6 }}>{loading ? '—' : totals.funnels}</div></Panel>
      </div>

      <div className="tt-grid-fluid">
        {!loading && products.map((product) => {
          const funnel = product.funnels?.[0]
          const Icon = TYPE_ICON[funnel?.funnel_type] || Package
          return (
            <Panel key={product.id} style={{ padding: 16, minHeight: 190, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'rgba(163,167,242,.12)', border: `1px solid ${H.line}` }}><Icon size={17} color={H.lavLight} /></div>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/produtos/${product.id}`} style={{ color: H.text, fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display:'block' }}>{product.name}</Link>
                    <div className="tt-cap" style={{ marginTop: 3 }}>{TYPE_LABEL[funnel?.funnel_type] || 'Sem funil'}</div>
                  </div>
                </div>
                <StatusPill tone={product.status === 'active' ? 'good' : product.status === 'paused' ? 'warn' : 'neutral'}>{product.status}</StatusPill>
              </div>

              <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="tt-inset" style={{ padding: 11 }}><div className="tt-cap">Preço</div><div className="tt-num" style={{ fontSize: 17, marginTop: 4 }}>{product.price_cents == null ? '—' : brl(product.price_cents / 100, 2)}</div></div>
                <div className="tt-inset" style={{ padding: 11 }}><div className="tt-cap">Etapas</div><div className="tt-num" style={{ fontSize: 17, marginTop: 4 }}>{funnel?.funnel_steps?.length || 0}</div></div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: 14, borderTop:`1px solid ${H.lineSoft}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap:8 }}>
                <span className="tt-cap">{product.funnels?.length || 0} funil{product.funnels?.length === 1 ? '' : 'is'}</span>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
                  <Link href={`/produtos/${product.id}`} className="tt-btn tt-btn-ghost" style={{minHeight:30,padding:'0 9px',fontSize:11}}>Abrir <ArrowUpRight size={12}/></Link>
                  <Link href={`/produtos/${product.id}?edit=1`} className="tt-btn tt-btn-ghost" style={{minHeight:30,padding:'0 9px',fontSize:11}}><Pencil size={12}/> Editar</Link>
                  <button className="tt-btn tt-btn-ghost" disabled={deletingId===product.id} onClick={()=>remove(product)} style={{minHeight:30,padding:'0 9px',fontSize:11,color:H.red,borderColor:'rgba(240,137,155,.22)'}}><Trash2 size={12}/> {deletingId===product.id?'Excluindo...':'Excluir'}</button>
                </div>
              </div>
            </Panel>
          )
        })}
      </div>

      {!loading && products.length === 0 && (
        <Panel style={{ padding: 48, textAlign: 'center' }}>
          <Package size={28} color={H.lav} />
          <h2 className="tt-h" style={{ marginTop: 14 }}>Seu primeiro produto começa aqui</h2>
          <p className="tt-cap" style={{ marginTop: 6 }}>Escolha Site, Site → Telegram, Telegram, WhatsApp, E-commerce ou um funil personalizado.</p>
          <Link href="/produtos/novo" className="tt-btn tt-btn-primary" style={{ marginTop: 18 }}><Plus size={14} /> Criar produto</Link>
        </Panel>
      )}
    </div>
  )
}
