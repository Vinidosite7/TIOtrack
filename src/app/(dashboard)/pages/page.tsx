'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Cloud, Plus, ExternalLink, Files, HardDrive, Rocket, Globe2, RefreshCw, Pencil, Trash2 } from 'lucide-react'
import { useWorkspaceStore } from '@/store/workspace'
import { H, PageHeader, Panel, StatusPill } from '@/components/hawk/ui'

function bytes(n?: number | null) {
  const v = Number(n || 0)
  if (v < 1024) return `${v} B`
  if (v < 1024 ** 2) return `${(v / 1024).toFixed(1)} KB`
  return `${(v / 1024 ** 2).toFixed(1)} MB`
}

function ago(value?: string | null) {
  if (!value) return '—'
  const ms = Date.now() - new Date(value).getTime()
  const m = Math.max(0, Math.floor(ms / 60000))
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m} min`
  if (m < 1440) return `há ${Math.floor(m / 60)} h`
  return `há ${Math.floor(m / 1440)} d`
}

export default function PagesPage() {
  const { active } = useWorkspaceStore()
  const [pages, setPages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState('')

  async function load() {
    if (!active?.id) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/pages?workspace_id=${encodeURIComponent(active.id)}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha ao carregar Pages')
      setPages(json.pages || [])
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao carregar') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [active?.id])

  async function remove(page: any) {
    if (!active?.id || deletingId) return
    if (!confirm(`Excluir a Page "${page.name}"? Os arquivos e deploys serão removidos e rotas ligadas a ela serão desativadas.`)) return
    setDeletingId(page.id); setError('')
    try {
      const res = await fetch(`/api/pages/${page.id}`, { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({workspace_id:active.id}) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Falha ao excluir Page')
      setPages(list => list.filter(p => p.id !== page.id))
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao excluir Page') }
    finally { setDeletingId('') }
  }

  const totals = useMemo(() => ({ online: pages.filter(p => p.status === 'online').length, files: pages.reduce((n,p)=>n+Number(p.files_count||0),0), size: pages.reduce((n,p)=>n+Number(p.size_bytes||0),0) }), [pages])

  return <div className="shell-page">
    <PageHeader title="Pages" sub="Hospede presells e landings dentro do Tiotrack, com deploys e rollback." right={<>
      <button className="tt-icon-btn" onClick={load} title="Atualizar"><RefreshCw size={14}/></button>
      <Link className="tt-btn tt-btn-primary" href="/pages/novo"><Plus size={14}/> Nova Page</Link>
    </>} />

    <div className="tt-grid-3" style={{ marginBottom: 14 }}>
      <Panel style={{ padding: 16 }}><div className="tt-cap">Pages</div><div className="tt-num" style={{fontSize:28,marginTop:6}}>{loading?'—':pages.length}</div></Panel>
      <Panel style={{ padding: 16 }}><div className="tt-cap">Online</div><div className="tt-num" style={{fontSize:28,marginTop:6,color:H.green}}>{loading?'—':totals.online}</div></Panel>
      <Panel style={{ padding: 16 }}><div className="tt-cap">Armazenamento</div><div className="tt-num" style={{fontSize:28,marginTop:6}}>{loading?'—':bytes(totals.size)}</div><div className="tt-cap" style={{marginTop:4}}>{loading?'':`${totals.files} arquivos`}</div></Panel>
    </div>

    {error && <Panel style={{padding:16,marginBottom:14,borderColor:'rgba(240,137,155,.25)'}}><div style={{color:H.red,fontSize:12}}>{error}</div></Panel>}

    <div className="tt-grid-fluid">
      {!loading && pages.map(page => <Panel key={page.id} style={{padding:16,minHeight:200,display:'flex',flexDirection:'column'}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'flex-start'}}>
            <div style={{display:'flex',gap:10,alignItems:'center',minWidth:0}}>
              <div style={{width:40,height:40,borderRadius:12,display:'grid',placeItems:'center',background:'rgba(163,167,242,.12)',border:`1px solid ${H.line}`}}><Cloud size={18} color={H.lavLight}/></div>
              <div style={{minWidth:0}}><Link href={`/pages/${page.id}`} style={{color:H.text,fontWeight:800,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',display:'block'}}>{page.name}</Link><div className="tt-cap" style={{marginTop:3}}>{page.slug}</div></div>
            </div>
            <StatusPill tone={page.status==='online'?'good':page.status==='error'?'bad':'warn'}>{page.status}</StatusPill>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:16}}>
            <div className="tt-inset" style={{padding:10}}><div className="tt-cap"><Files size={11} style={{verticalAlign:'-2px',marginRight:5}}/>Arquivos</div><div className="tt-num" style={{fontSize:16,marginTop:4}}>{page.files_count||0}</div></div>
            <div className="tt-inset" style={{padding:10}}><div className="tt-cap"><HardDrive size={11} style={{verticalAlign:'-2px',marginRight:5}}/>Tamanho</div><div className="tt-num" style={{fontSize:16,marginTop:4}}>{bytes(page.size_bytes)}</div></div>
          </div>
          <div style={{marginTop:'auto',paddingTop:14,borderTop:`1px solid ${H.lineSoft}`,display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
            <span className="tt-cap"><Rocket size={11} style={{verticalAlign:'-2px',marginRight:5}}/>{ago(page.last_deployed_at||page.updated_at)}</span>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
              {page.preview_url && <a href={page.preview_url} target="_blank" rel="noreferrer" className="tt-btn tt-btn-ghost" style={{minHeight:30,padding:'0 9px',fontSize:11}}><ExternalLink size={12}/> Preview</a>}
              <Link href={`/pages/${page.id}?edit=1`} className="tt-btn tt-btn-ghost" style={{minHeight:30,padding:'0 9px',fontSize:11}}><Pencil size={12}/> Editar</Link>
              <button className="tt-btn tt-btn-ghost" disabled={deletingId===page.id} onClick={()=>remove(page)} style={{minHeight:30,padding:'0 9px',fontSize:11,color:H.red,borderColor:'rgba(240,137,155,.22)'}}><Trash2 size={12}/> {deletingId===page.id?'Excluindo...':'Excluir'}</button>
            </div>
          </div>
        </Panel>)}
    </div>

    {!loading && pages.length===0 && <Panel style={{padding:48,textAlign:'center'}}><Globe2 size={30} color={H.lav}/><h2 className="tt-h" style={{marginTop:14}}>Hospede sua primeira presell</h2><p className="tt-cap" style={{marginTop:6}}>Envie um ZIP com index.html, CSS, JS e imagens. O Tiotrack publica e versiona tudo.</p><Link href="/pages/novo" className="tt-btn tt-btn-primary" style={{marginTop:18}}><Plus size={14}/> Criar Page</Link></Panel>}
  </div>
}
