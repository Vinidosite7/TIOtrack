'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, UploadCloud, RotateCcw, FileCode2, Rocket, CheckCircle2, Pencil, Trash2, Save, X } from 'lucide-react'
import { useWorkspaceStore } from '@/store/workspace'
import { H, PageHeader, Panel, StatusPill, Empty } from '@/components/hawk/ui'

function bytes(n?:number|null){const v=Number(n||0);return v<1024?`${v} B`:v<1048576?`${(v/1024).toFixed(1)} KB`:`${(v/1048576).toFixed(1)} MB`}

export default function PageDetail(){
  const { id } = useParams<{id:string}>()
  const router = useRouter()
  const {active}=useWorkspaceStore()
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [zip,setZip]=useState<File|null>(null)
  const [busy,setBusy]=useState(false)
  const [deleting,setDeleting]=useState(false)
  const [error,setError]=useState('')
  const [editing,setEditing]=useState(false)
  const [autoEditHandled,setAutoEditHandled]=useState(false)
  const [form,setForm]=useState<any>({name:'',status:'online'})

  async function load(){
    if(!active?.id)return
    setLoading(true);setError('')
    try{
      const r=await fetch(`/api/pages/${id}?workspace_id=${encodeURIComponent(active.id)}`,{cache:'no-store'})
      const j=await r.json()
      if(!r.ok)throw new Error(j.error||'Falha')
      setData(j)
    }catch(e){setError(e instanceof Error?e.message:'Falha')}
    finally{setLoading(false)}
  }

  useEffect(()=>{load()},[active?.id,id])

  function openEdit(target=data?.page){
    if(!target)return
    setForm({name:target.name||'',status:target.status||'online'})
    setEditing(true)
  }

  useEffect(()=>{
    if(!data?.page||autoEditHandled||typeof window==='undefined')return
    setAutoEditHandled(true)
    if(new URLSearchParams(window.location.search).get('edit')==='1')openEdit(data.page)
  },[data?.page,autoEditHandled])

  async function save(){
    if(!active?.id||busy)return
    setBusy(true);setError('')
    try{
      const r=await fetch(`/api/pages/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({workspace_id:active.id,name:form.name,status:form.status})})
      const j=await r.json()
      if(!r.ok)throw new Error(j.error||'Falha ao editar Page')
      setEditing(false)
      router.replace(`/pages/${id}`)
      await load()
      router.refresh()
    }catch(e){setError(e instanceof Error?e.message:'Erro')}
    finally{setBusy(false)}
  }

  async function deploy(){
    if(!active?.id||!zip)return
    setBusy(true);setError('')
    try{const fd=new FormData();fd.set('workspace_id',active.id);fd.set('zip',zip);const r=await fetch(`/api/pages/${id}/deploy`,{method:'POST',body:fd});const j=await r.json();if(!r.ok)throw new Error(j.error||'Falha no deploy');setZip(null);await load()}catch(e){setError(e instanceof Error?e.message:'Erro')}finally{setBusy(false)}
  }

  async function rollback(depId:string){
    if(!active?.id||busy)return
    if(!confirm('Restaurar este deploy como versão ativa?'))return
    setBusy(true);setError('')
    try{const r=await fetch(`/api/pages/${id}/rollback`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({workspace_id:active.id,deployment_id:depId})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Falha');await load()}catch(e){setError(e instanceof Error?e.message:'Erro')}finally{setBusy(false)}
  }

  async function remove(){
    const page=data?.page
    if(!active?.id||!page||deleting)return
    if(!confirm(`Excluir a Page "${page.name}"? Os arquivos e deploys serão removidos e rotas ligadas a ela serão desativadas.`))return
    setDeleting(true);setError('')
    try{
      const r=await fetch(`/api/pages/${id}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({workspace_id:active.id})})
      const j=await r.json().catch(()=>({}))
      if(!r.ok)throw new Error(j.error||'Falha ao excluir Page')
      router.push('/pages')
      router.refresh()
    }catch(e){setError(e instanceof Error?e.message:'Erro ao excluir Page');setDeleting(false)}
  }

  if(loading&&!data)return <div className="shell-page"><PageHeader title="Page" sub="Carregando..."/></div>
  const page=data?.page; const current=page?.current_deployment_id

  return <div className="shell-page"><PageHeader title={page?.name||'Page'} sub={page?.slug||''} right={<div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap'}}>
    <Link href="/pages" className="tt-btn"><ArrowLeft size={14}/> Pages</Link>
    {data?.preview_url&&<a href={data.preview_url} target="_blank" rel="noreferrer" className="tt-btn"><ExternalLink size={14}/> Preview</a>}
    {!editing&&<button className="tt-btn" onClick={()=>openEdit()}><Pencil size={14}/> Editar</button>}
    <button className="tt-btn" disabled={deleting} onClick={remove} style={{color:H.red,borderColor:'rgba(240,137,155,.22)'}}><Trash2 size={14}/> {deleting?'Excluindo...':'Excluir'}</button>
  </div>}/>

    {error&&<Panel style={{padding:14,marginBottom:14,borderColor:'rgba(240,137,155,.25)'}}><div style={{color:H.red,fontSize:12}}>{error}</div></Panel>}

    {editing&&<Panel style={{padding:18,marginBottom:14,borderColor:'rgba(163,167,242,.28)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}><div><div className="tt-h">Editar Page</div><div className="tt-cap" style={{marginTop:3}}>Renomear não altera o slug nem quebra URLs já publicadas.</div></div><button className="tt-icon-btn" onClick={()=>setEditing(false)}><X size={14}/></button></div>
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 190px',gap:10,marginTop:14}}><div><label className="tt-cap">Nome</label><input className="tt-input" style={{marginTop:7}} value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></div><div><label className="tt-cap">Status</label><select className="tt-select" style={{marginTop:7}} value={form.status||'online'} onChange={e=>setForm({...form,status:e.target.value})}><option value="online">Online</option><option value="draft">Rascunho</option><option value="archived">Arquivada</option><option value="error">Erro</option></select></div></div>
      <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16,paddingTop:14,borderTop:`1px solid ${H.line}`}}><button className="tt-btn" disabled={busy} onClick={()=>setEditing(false)}>Cancelar</button><button className="tt-btn tt-btn-primary" disabled={busy||!String(form.name||'').trim()} onClick={save}><Save size={14}/>{busy?'Salvando...':'Salvar alterações'}</button></div>
    </Panel>}

    <div className="hk-row2">
      <Panel><div style={{padding:18}}><div style={{display:'flex',justifyContent:'space-between',gap:10}}><div><div className="tt-cap">Status</div><div style={{marginTop:7}}><StatusPill tone={page?.status==='online'?'good':'warn'}>{page?.status||'—'}</StatusPill></div></div><div><div className="tt-cap">Arquivos</div><div className="tt-num" style={{fontSize:22,marginTop:6}}>{page?.files_count||0}</div></div><div><div className="tt-cap">Tamanho</div><div className="tt-num" style={{fontSize:22,marginTop:6}}>{bytes(page?.size_bytes)}</div></div></div>
        <div style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${H.line}`}}><div className="tt-h">Novo deploy</div><div className="tt-cap" style={{marginTop:4}}>Envie outro ZIP. A versão atual continua disponível para rollback.</div><div style={{display:'flex',gap:8,marginTop:12,alignItems:'center',flexWrap:'wrap'}}><label className="tt-btn" style={{cursor:'pointer'}}><UploadCloud size={14}/>{zip?zip.name:'Escolher ZIP'}<input type="file" accept=".zip,application/zip" style={{display:'none'}} onChange={e=>setZip(e.target.files?.[0]||null)}/></label><button className="tt-btn tt-btn-primary" disabled={!zip||busy} onClick={deploy}>{busy?'Enviando...':'Publicar deploy'}</button></div></div>
      </div></Panel>
      <Panel><div style={{padding:18}}><div className="tt-h">Arquivos ativos</div><div className="tt-cap" style={{marginTop:4}}>Conteúdo do deployment atualmente publicado.</div><div style={{marginTop:12,maxHeight:310,overflow:'auto'}}>{(data?.files||[]).length===0?<Empty>Nenhum arquivo.</Empty>:(data.files||[]).map((f:any)=><div key={f.id} style={{display:'flex',justifyContent:'space-between',gap:10,padding:'9px 0',borderBottom:`1px solid ${H.lineSoft}`}}><span className="tt-mono" style={{fontSize:11,color:H.sub,overflow:'hidden',textOverflow:'ellipsis'}}><FileCode2 size={11} style={{marginRight:6,verticalAlign:'-2px'}}/>{f.path}</span><span className="tt-cap" style={{flexShrink:0}}>{bytes(f.size_bytes)}</span></div>)}</div></div></Panel>
    </div>
    <Panel style={{marginTop:14}}><div style={{padding:18}}><div className="tt-h">Deploys</div><div className="tt-cap" style={{marginTop:4}}>Histórico versionado. O rollback só troca o deployment ativo; não apaga versões.</div><div style={{marginTop:12}}>{(data?.deployments||[]).map((d:any)=><div key={d.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:`1px solid ${H.lineSoft}`}}><div style={{width:34,height:34,borderRadius:10,display:'grid',placeItems:'center',background:d.id===current?'rgba(116,211,171,.10)':'rgba(163,167,242,.08)'}}>{d.id===current?<CheckCircle2 size={15} color={H.green}/>:<Rocket size={15} color={H.lav}/>}</div><div style={{flex:1}}><div style={{color:H.text,fontWeight:700,fontSize:13}}>Deploy #{d.version} {d.id===current&&<span style={{color:H.green,fontSize:10,marginLeft:6}}>ATUAL</span>}</div><div className="tt-cap" style={{marginTop:3}}>{new Date(d.created_at).toLocaleString('pt-BR')} · {d.files_count} arquivos · {bytes(d.size_bytes)}</div></div>{d.id!==current&&d.status==='published'&&<button className="tt-btn tt-btn-ghost" disabled={busy} onClick={()=>rollback(d.id)}><RotateCcw size={13}/> Restaurar</button>}</div>)}</div></div></Panel>
  </div>
}
