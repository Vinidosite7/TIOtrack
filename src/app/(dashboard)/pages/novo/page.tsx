'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileArchive, UploadCloud, CheckCircle2, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useWorkspaceStore } from '@/store/workspace'
import { H, PageHeader, Panel } from '@/components/hawk/ui'

export default function NewPage() {
  const { active } = useWorkspaceStore()
  const router = useRouter()
  const [name,setName] = useState('')
  const [zip,setZip] = useState<File|null>(null)
  const [saving,setSaving] = useState(false)
  const [error,setError] = useState('')

  async function publish() {
    if (!active?.id || !name.trim() || !zip) return
    setSaving(true); setError('')
    try {
      const fd = new FormData(); fd.set('workspace_id',active.id); fd.set('name',name.trim()); fd.set('zip',zip)
      const res = await fetch('/api/pages',{method:'POST',body:fd})
      const json = await res.json()
      if (!res.ok) throw new Error(json.error||'Falha ao publicar')
      router.push(`/pages/${json.page.id}`)
    } catch(e){ setError(e instanceof Error?e.message:'Erro inesperado') }
    finally { setSaving(false) }
  }

  return <div className="shell-page">
    <PageHeader title="Nova Page" sub="Envie sua landing estática em ZIP. O index.html deve estar na raiz." right={<Link href="/pages" className="tt-btn"><ArrowLeft size={14}/> Voltar</Link>}/>
    <div style={{maxWidth:900}}>
      <Panel style={{padding:22}}>
        <div><label className="tt-cap">Nome interno</label><input className="tt-input" style={{marginTop:8}} value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Presell Detox BR"/></div>
        <div style={{marginTop:18}}><label className="tt-cap">Arquivo ZIP</label>
          <label style={{marginTop:8,minHeight:210,border:`1px dashed ${zip?'rgba(116,211,171,.45)':'rgba(163,167,242,.24)'}`,borderRadius:18,display:'grid',placeItems:'center',cursor:'pointer',background:zip?'rgba(116,211,171,.04)':'rgba(163,167,242,.035)'}}>
            <input type="file" accept=".zip,application/zip" style={{display:'none'}} onChange={e=>setZip(e.target.files?.[0]||null)}/>
            <div style={{textAlign:'center',padding:22}}>
              {zip?<CheckCircle2 size={34} color={H.green}/>:<UploadCloud size={36} color={H.lav}/>} 
              <div style={{marginTop:12,color:H.text,fontWeight:800}}>{zip?zip.name:'Clique para escolher o ZIP'}</div>
              <div className="tt-cap" style={{marginTop:6}}>{zip?`${(zip.size/1024/1024).toFixed(2)} MB`:'index.html + assets · até 35 MB compactado'}</div>
            </div>
          </label>
        </div>
        <div className="tt-inset" style={{padding:14,marginTop:16,display:'flex',gap:10,alignItems:'flex-start'}}><ShieldCheck size={17} color={H.lav}/><div><div style={{color:H.text,fontWeight:700,fontSize:12}}>Publicação isolada</div><div className="tt-cap" style={{marginTop:4,lineHeight:1.55}}>Os arquivos ficam no bucket de Pages e depois são servidos pelo Edge no domínio ligado à rota. O Tiotrack mantém cada deploy separado para permitir rollback.</div></div></div>
        {error&&<div style={{color:H.red,fontSize:12,marginTop:14}}>{error}</div>}
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20,paddingTop:16,borderTop:`1px solid ${H.line}`}}><button disabled={!name.trim()||!zip||saving} onClick={publish} className="tt-btn tt-btn-primary"><FileArchive size={14}/>{saving?'Publicando...':'Publicar Page'}</button></div>
      </Panel>
    </div>
  </div>
}
