'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, Eye, EyeOff, RefreshCw,
  CheckCircle, XCircle, AlertCircle,
  Wifi, WifiOff, DollarSign, Zap,
  ExternalLink, ChevronDown, ChevronRight,
} from 'lucide-react'
import { T } from '@/lib/tokens'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'
import { GridBg, sharedStyles } from '@/components/ui/shared'

// ── Tipos ──────────────────────────────────────────────────────
type AdvAccount = { id: string; advertiser_id: string; nome: string | null; balance: number | null; currency: string | null; status: string | null }
type BC = { id: string; apelido: string; bc_id: string; ativo: boolean; last_sync: string | null; sync_status: string | null; sync_error: string | null; advertiser_accounts: AdvAccount[] }
type MetaConn = { id: string; fb_user_id: string; fb_user_name: string; created_at: string }
type MetaAcc = { id: string; account_fb_id: string; account_id: string; nome: string; balance: number | null; currency: string; status: string; last_balance_sync: string | null }

// ── Helpers ────────────────────────────────────────────────────
function toBRL(v: number, cur?: string | null) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: cur === 'USD' ? 'USD' : 'BRL', maximumFractionDigits: 0 })
}
function timeAgo(s: string) {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (m < 1) return 'agora'; if (m < 60) return `${m}min`; if (m < 1440) return `${Math.floor(m/60)}h`; return `${Math.floor(m/1440)}d`
}

// ── SVG logos inline ───────────────────────────────────────────
function TikTokLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
    </svg>
  )
}
function MetaLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

// ── Platform card ──────────────────────────────────────────────
function PlatformCard({
  logo, name, description, status, statusLabel,
  stats, color, children, onExpand, expanded,
}: {
  logo: React.ReactNode
  name: string
  description: string
  status: 'connected' | 'disconnected' | 'partial'
  statusLabel: string
  stats?: { label: string; value: string }[]
  color: string
  children?: React.ReactNode
  onExpand?: () => void
  expanded?: boolean
}) {
  const STATUS_CFG = {
    connected:    { color: T.green,  bg: 'rgba(16,185,129,0.1)',  dot: T.green  },
    disconnected: { color: T.text3,  bg: 'rgba(100,116,139,0.1)', dot: T.text3  },
    partial:      { color: T.yellow, bg: 'rgba(245,158,11,0.1)',  dot: T.yellow },
  }
  const s = STATUS_CFG[status]

  return (
    <div style={{
      background: T.bgSurface,
      border: `1px solid ${status === 'connected' ? `${color}25` : T.border}`,
      borderRadius: 14, overflow: 'hidden',
      boxShadow: status === 'connected' ? `0 0 0 1px ${color}10, 0 4px 24px ${color}08` : 'none',
      transition: 'all 200ms ease',
    }}>
      {/* Linha de cor no topo */}
      {status === 'connected' && (
        <div style={{ height: 2, background: `linear-gradient(90deg, ${color}, ${color}40)` }} />
      )}

      <div style={{ padding: '16px 18px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
          {/* Logo */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: `${color}12`,
            border: `1px solid ${color}25`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {logo}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.text1 }}>{name}</span>
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 20,
                background: s.bg, color: s.color,
                display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, boxShadow: status === 'connected' ? `0 0 4px ${s.dot}` : 'none' }} />
                {statusLabel}
              </span>
            </div>
            <p style={{ fontSize: 12, color: T.text3, lineHeight: 1.5 }}>{description}</p>
          </div>

          {/* Expand */}
          {onExpand && status === 'connected' && (
            <button onClick={onExpand} style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, color: T.text3, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronDown size={13} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 160ms' }} />
            </button>
          )}
        </div>

        {/* Stats */}
        {stats && stats.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {stats.map(st => (
              <div key={st.label} style={{ background: T.bgRaised, border: `1px solid ${T.border}`, borderRadius: 7, padding: '5px 10px' }}>
                <div style={{ fontSize: 9, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{st.label}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: T.text1 }}>{st.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Actions / content */}
        {children}
      </div>

      {/* Contas expandidas */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${T.borderSub}` }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── Input helpers ──────────────────────────────────────────────
function FInput({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
    style={{ width: '100%', height: 36, padding: '0 12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 8, color: T.text1, fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }} />
}
function FSecret({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', height: 36, padding: '0 36px 0 12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 8, color: T.text1, fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }} />
      <button onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: T.text3, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  )
}

// ── Accounts list ──────────────────────────────────────────────
function AccountRow({ nome, id, balance, currency, status, warn }: { nome: string; id: string; balance: number | null; currency?: string | null; status: string; warn: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderBottom: `1px solid ${T.borderSub}` }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: status === 'ACTIVE' ? T.green : T.text3, boxShadow: status === 'ACTIVE' ? `0 0 5px ${T.green}` : 'none' }} />
      <span style={{ fontSize: 12, color: T.text2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</span>
      <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono', monospace" }}>#{id.slice(-6)}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: warn ? T.yellow : T.text1 }}>
        {balance !== null ? toBRL(balance, currency) : '—'}
      </span>
      {warn && <AlertCircle size={12} style={{ color: T.yellow }} />}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────
export default function IntegracoesPage() {
  const { active: workspace } = useWorkspaceStore()

  const [bcs, setBcs]               = useState<BC[]>([])
  const [metaConns, setMetaConns]   = useState<MetaConn[]>([])
  const [metaAccs, setMetaAccs]     = useState<MetaAcc[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [syncingBc, setSyncingBc]   = useState<string | null>(null)
  const [syncingMeta, setSyncingMeta] = useState<string | null>(null)
  const [showTkForm, setShowTkForm] = useState(false)
  const [showMetaForm, setShowMetaForm] = useState(false)
  const [metaToken, setMetaToken] = useState('')
  const [metaApelido, setMetaApelido] = useState('')
  const [metaTestState, setMetaTestState] = useState<'idle'|'testing'|'ok'|'fail'>('idle')
  const [metaTestMsg, setMetaTestMsg] = useState('')
  const [savingMeta, setSavingMeta] = useState(false)
  const [expandTk, setExpandTk]     = useState(true)
  const [expandMeta, setExpandMeta] = useState(true)
  const [testState, setTestState]   = useState<'idle'|'testing'|'ok'|'fail'>('idle')
  const [testMsg, setTestMsg]       = useState('')
  const [toast, setToast]           = useState<{type:'ok'|'err';msg:string}|null>(null)
  const [form, setForm]             = useState({ apelido: '', bc_id: '', access_token: '', proxy_url: '' })

  function showToast(type: 'ok'|'err', msg: string) { setToast({ type, msg }); setTimeout(() => setToast(null), 3500) }

  const load = useCallback(async (wid: string) => {
    setLoading(true)
    const [bcRes, mcRes, maRes] = await Promise.all([
      supabase.from('bc_configs').select(`id,apelido,bc_id,ativo,last_sync,sync_status,sync_error,advertiser_accounts(id,advertiser_id,nome,balance,currency,status,last_balance_sync)`).eq('workspace_id', wid).order('created_at'),
      (supabase as any).from('meta_connections').select('id,fb_user_id,fb_user_name,created_at').eq('workspace_id', wid),
      (supabase as any).from('meta_ad_accounts').select('id,account_fb_id,account_id,nome,balance,currency,status,last_balance_sync').eq('workspace_id', wid),
    ])
    setBcs((bcRes.data as BC[]) ?? [])
    setMetaConns(((mcRes as any).data as MetaConn[]) ?? [])
    setMetaAccs(((maRes as any).data as MetaAcc[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { if (workspace?.id) load(workspace.id) }, [workspace?.id])

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('meta_success')) { showToast('ok', `Meta Ads conectado! ${p.get('accounts')} contas importadas.`); window.history.replaceState({}, '', '/integracoes'); if (workspace?.id) load(workspace.id) }
    if (p.get('meta_error'))   { showToast('err', p.get('meta_error') === 'cancelled' ? 'Conexão cancelada.' : 'Erro ao conectar com o Meta.'); window.history.replaceState({}, '', '/integracoes') }
  }, [])

  async function handleTestMeta() {
    if (!metaToken) { setMetaTestState('fail'); setMetaTestMsg('Cole o access token primeiro.'); return }
    setMetaTestState('testing')
    try {
      const res  = await fetch(`/api/meta/sync?token=${encodeURIComponent(metaToken)}`)
      const json = await res.json()
      if (json.ok) { setMetaTestState('ok'); setMetaTestMsg(`OK — ${json.user} · ${json.accounts} conta(s)`) }
      else          { setMetaTestState('fail'); setMetaTestMsg(json.message ?? 'Token inválido.') }
    } catch { setMetaTestState('fail'); setMetaTestMsg('Erro de rede.') }
  }

  async function handleSaveMeta() {
    if (!workspace?.id || !metaToken) { showToast('err', 'Cole o access token.'); return }
    setSavingMeta(true)
    const res  = await fetch('/api/meta/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace_id: workspace.id, access_token: metaToken, apelido: metaApelido || undefined }) })
    const json = await res.json()
    if (json.ok) {
      showToast('ok', `Meta conectado! ${json.accounts} contas importadas.`)
      setMetaToken(''); setMetaApelido(''); setMetaTestState('idle'); setShowMetaForm(false)
      await load(workspace.id)
    } else {
      showToast('err', json.message ?? json.error ?? 'Erro ao conectar.')
    }
    setSavingMeta(false)
  }

  function handleConnectMeta() {
    if (!workspace?.id) return
    const appId = '1830454530968970'
    const redir = encodeURIComponent(`${window.location.origin}/api/auth/meta/callback`)
    const scope = 'ads_read,ads_management,business_management,read_insights'
    window.location.href = `https://www.facebook.com/dialog/oauth?client_id=${appId}&redirect_uri=${redir}&scope=${scope}&state=${workspace.id}&response_type=code&auth_type=rerequest`
  }

  async function handleTest() {
    if (!form.bc_id || !form.access_token) { setTestState('fail'); setTestMsg('Preencha BC ID e Token.'); return }
    setTestState('testing')
    try {
      const res  = await fetch('/api/tiktok/test-bc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bc_id: form.bc_id, access_token: form.access_token }) })
      const json = await res.json()
      json.ok ? (setTestState('ok'), setTestMsg(`OK — ${json.advertisers} advertiser(s)`)) : (setTestState('fail'), setTestMsg(json.message ?? 'Falha.'))
    } catch { setTestState('fail'); setTestMsg('Erro de rede.') }
  }

  async function handleSaveBc() {
    if (!workspace?.id || !form.apelido || !form.bc_id || !form.access_token) { showToast('err', 'Preencha todos os campos.'); return }
    setSaving(true)
    const { error } = await supabase.from('bc_configs').insert({ workspace_id: workspace.id, apelido: form.apelido, bc_id: form.bc_id, access_token: form.access_token, proxy_url: form.proxy_url || null, ativo: true })
    if (error) { showToast('err', error.message); setSaving(false); return }
    setForm({ apelido: '', bc_id: '', access_token: '', proxy_url: '' }); setTestState('idle'); setShowTkForm(false)
    showToast('ok', 'BC adicionada! Clique em sincronizar.'); await load(workspace.id); setSaving(false)
  }

  async function handleSyncBc(bc: BC) {
    setSyncingBc(bc.id)
    const { error } = await supabase.functions.invoke('sync-bc', { body: { bc_config_id: bc.id, workspace_id: workspace?.id } })
    error ? showToast('err', `Sync falhou: ${error.message}`) : showToast('ok', `"${bc.apelido}" sincronizada!`)
    if (workspace?.id) await load(workspace.id); setSyncingBc(null)
  }

  async function handleDeleteBc(id: string) {
    if (!confirm('Remover esta BC?')) return
    await supabase.from('bc_configs').delete().eq('id', id)
    if (workspace?.id) load(workspace.id)
  }

  async function handleSyncMeta(conn: MetaConn) {
    setSyncingMeta(conn.fb_user_id)
    const res  = await fetch('/api/meta/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace_id: workspace?.id, fb_user_id: conn.fb_user_id }) })
    const json = await res.json()
    json.ok ? showToast('ok', `Meta sincronizado — ${json.synced} contas.`) : showToast('err', json.error ?? 'Sync falhou.')
    if (workspace?.id) await load(workspace.id); setSyncingMeta(null)
  }

  async function handleDisconnectMeta(conn: MetaConn) {
    if (!confirm(`Desconectar ${conn.fb_user_name}?`)) return
    await fetch('/api/meta/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace_id: workspace?.id, fb_user_id: conn.fb_user_id }) })
    if (workspace?.id) load(workspace.id); showToast('ok', 'Desconectado.')
  }

  const totalTk   = bcs.flatMap(b => b.advertiser_accounts).reduce((s, a) => s + (a.balance ?? 0), 0)
  const totalMeta = metaAccs.reduce((s, a) => s + (a.balance ?? 0), 0)
  const tkContas  = bcs.flatMap(b => b.advertiser_accounts).length
  const warnTk    = bcs.flatMap(b => b.advertiser_accounts).some(a => (a.balance ?? 0) < 100)
  const warnMeta  = metaAccs.some(a => (a.balance ?? 0) < 20)

  // Status geral TikTok
  const tkStatus = bcs.length === 0 ? 'disconnected' : warnTk ? 'partial' : 'connected'
  const metaStatus = metaConns.length === 0 ? 'disconnected' : warnMeta ? 'partial' : 'connected'

  const tkStats = bcs.length > 0 ? [
    { label: 'BCs', value: String(bcs.length) },
    { label: 'Contas', value: String(tkContas) },
    { label: 'Saldo total', value: toBRL(totalTk) },
  ] : undefined

  const metaStats = metaConns.length > 0 ? [
    { label: 'Contas', value: String(metaAccs.length) },
    { label: 'Saldo total', value: toBRL(totalMeta) },
  ] : undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: T.bgBase, position: 'relative' }}>
      <GridBg />

      {/* Topbar */}
      <div style={{ height: 48, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0, background: 'rgba(5,8,16,0.85)', backdropFilter: 'blur(12px)', position: 'relative', zIndex: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text1 }}>Integrações</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 1 }}>

        {/* Toast */}
        {toast && (
          <div style={{ borderRadius: 8, padding: '9px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, background: toast.type === 'ok' ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.06)', border: `1px solid ${toast.type === 'ok' ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`, color: toast.type === 'ok' ? T.green : T.red }}>
            {toast.type === 'ok' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}{toast.msg}
          </div>
        )}

        {/* Título seção */}
        <div>
          <p style={{ fontSize: 11, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 12 }}>Fontes de tráfego</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

            {/* ── TikTok Ads ── */}
            <div style={{ background: T.bgSurface, border: `1px solid ${tkStatus === 'connected' ? 'rgba(255,255,255,0.12)' : T.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: tkStatus === 'connected' ? '0 4px 24px rgba(0,0,0,0.3)' : 'none' }}>
              {tkStatus === 'connected' && <div style={{ height: 2, background: 'linear-gradient(90deg, #fff, rgba(255,255,255,0.2))' }} />}
              <div style={{ padding: '18px 18px 14px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#000', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TikTokLogo size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: T.text1 }}>TikTok Ads</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: tkStatus === 'connected' ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)', color: tkStatus === 'connected' ? T.green : T.text3, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: tkStatus === 'connected' ? T.green : T.text3, boxShadow: tkStatus === 'connected' ? `0 0 4px ${T.green}` : 'none' }} />
                        {tkStatus === 'connected' ? `${bcs.length} BC${bcs.length > 1 ? 's' : ''} ativa${bcs.length > 1 ? 's' : ''}` : 'Não conectado'}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: T.text3 }}>Sincronize campanhas, adsets e criativos do TikTok Ads.</p>
                  </div>
                  {bcs.length > 0 && (
                    <button onClick={() => setExpandTk(e => !e)} style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, color: T.text3, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <ChevronDown size={13} style={{ transform: expandTk ? 'rotate(180deg)' : 'none', transition: 'transform 160ms' }} />
                    </button>
                  )}
                </div>

                {/* Stats */}
                {tkStats && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    {tkStats.map(st => (
                      <div key={st.label} style={{ background: T.bgRaised, border: `1px solid ${T.border}`, borderRadius: 7, padding: '5px 10px' }}>
                        <div style={{ fontSize: 9, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{st.label}</div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: warnTk ? T.yellow : T.text1 }}>{st.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botões */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowTkForm(s => !s)} style={{ flex: 1, height: 34, borderRadius: 8, background: showTkForm ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)', border: `1px solid ${T.border}`, color: T.text1, fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', transition: 'all 160ms' }}>
                    <Plus size={13} />{showTkForm ? 'Cancelar' : 'Adicionar BC'}
                  </button>
                  {bcs.length > 0 && bcs.map(bc => (
                    <button key={bc.id} onClick={() => handleSyncBc(bc)} disabled={syncingBc === bc.id} title={`Sync ${bc.apelido}`} style={{ height: 34, padding: '0 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, color: T.text3, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                      <RefreshCw size={12} style={{ animation: syncingBc === bc.id ? 'spin 1s linear infinite' : 'none' }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Form nova BC */}
              {showTkForm && (
                <div style={{ borderTop: `1px solid ${T.borderSub}`, padding: '14px 18px', background: T.bgRaised }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><label style={{ fontSize: 11, color: T.text2, display: 'block', marginBottom: 5 }}>Apelido</label><FInput value={form.apelido} onChange={v => setForm(f => ({ ...f, apelido: v }))} placeholder="Ex: BC Principal" /></div>
                    <div><label style={{ fontSize: 11, color: T.text2, display: 'block', marginBottom: 5 }}>BC ID</label><FInput value={form.bc_id} onChange={v => setForm(f => ({ ...f, bc_id: v }))} placeholder="Ex: 7123456789" /></div>
                  </div>
                  <div style={{ marginBottom: 10 }}><label style={{ fontSize: 11, color: T.text2, display: 'block', marginBottom: 5 }}>Access Token</label><FSecret value={form.access_token} onChange={v => setForm(f => ({ ...f, access_token: v }))} placeholder="Cole o access token" /></div>
                  <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: T.text2, display: 'block', marginBottom: 5 }}>Proxy URL <span style={{ color: T.text3 }}>(opcional)</span></label><FInput value={form.proxy_url} onChange={v => setForm(f => ({ ...f, proxy_url: v }))} placeholder="http://user:pass@ip:porta" /></div>
                  {testMsg && (
                    <div style={{ marginBottom: 10, padding: '7px 10px', borderRadius: 6, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", background: testState === 'ok' ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.06)', border: `1px solid ${testState === 'ok' ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`, color: testState === 'ok' ? T.green : T.red, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {testState === 'ok' ? <CheckCircle size={11} /> : <XCircle size={11} />}{testMsg}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleTest} disabled={testState === 'testing'} style={{ height: 32, padding: '0 14px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, color: T.text2, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Wifi size={12} />{testState === 'testing' ? 'Testando...' : testState === 'ok' ? 'OK ✓' : 'Testar'}
                    </button>
                    <button onClick={handleSaveBc} disabled={saving} style={{ height: 32, padding: '0 16px', borderRadius: 7, background: T.accent, border: 'none', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                      {saving ? 'Salvando...' : 'Salvar BC'}
                    </button>
                  </div>
                </div>
              )}

              {/* Lista BCs expandida */}
              {expandTk && bcs.length > 0 && (
                <div style={{ borderTop: `1px solid ${T.borderSub}` }}>
                  {bcs.map(bc => (
                    <div key={bc.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: T.bgRaised, borderBottom: `1px solid ${T.borderSub}` }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: bc.ativo ? T.green : T.text3, boxShadow: bc.ativo ? `0 0 5px ${T.green}` : 'none' }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: T.text1 }}>{bc.apelido}</span>
                        <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono', monospace" }}>BC {bc.bc_id}</span>
                        <div style={{ flex: 1 }} />
                        {bc.last_sync && <span style={{ fontSize: 10, color: T.text3 }}>sync {timeAgo(bc.last_sync)}</span>}
                        <button onClick={() => handleDeleteBc(bc.id)} style={{ width: 24, height: 24, borderRadius: 5, background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', color: T.red, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                      {bc.advertiser_accounts.map(adv => (
                        <AccountRow key={adv.id} nome={adv.nome ?? `#${adv.advertiser_id}`} id={adv.advertiser_id} balance={adv.balance} currency={adv.currency} status={adv.status ?? 'ACTIVE'} warn={(adv.balance ?? 0) < 100} />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Meta Ads ── */}
            <div style={{ background: T.bgSurface, border: `1px solid ${metaStatus === 'connected' ? 'rgba(24,119,242,0.3)' : T.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: metaStatus === 'connected' ? '0 4px 24px rgba(24,119,242,0.08)' : 'none' }}>
              {metaStatus === 'connected' && <div style={{ height: 2, background: 'linear-gradient(90deg, #1877F2, rgba(24,119,242,0.3))' }} />}
              <div style={{ padding: '18px 18px 14px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(24,119,242,0.1)', border: '1px solid rgba(24,119,242,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MetaLogo size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: T.text1 }}>Meta Ads</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: metaStatus === 'connected' ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)', color: metaStatus === 'connected' ? T.green : T.text3, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: metaStatus === 'connected' ? T.green : T.text3, boxShadow: metaStatus === 'connected' ? `0 0 4px ${T.green}` : 'none' }} />
                        {metaStatus === 'connected' ? `${metaConns.length} conta${metaConns.length > 1 ? 's' : ''} ativa${metaConns.length > 1 ? 's' : ''}` : 'Não conectado'}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: T.text3 }}>Conecte sua Business Manager e sincronize campanhas do Facebook e Instagram Ads.</p>
                  </div>
                  {metaConns.length > 0 && (
                    <button onClick={() => setExpandMeta(e => !e)} style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, color: T.text3, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <ChevronDown size={13} style={{ transform: expandMeta ? 'rotate(180deg)' : 'none', transition: 'transform 160ms' }} />
                    </button>
                  )}
                </div>

                {/* Stats */}
                {metaStats && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    {metaStats.map(st => (
                      <div key={st.label} style={{ background: T.bgRaised, border: `1px solid ${T.border}`, borderRadius: 7, padding: '5px 10px' }}>
                        <div style={{ fontSize: 9, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{st.label}</div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: warnMeta ? T.yellow : T.text1 }}>{st.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botão conectar / form */}
                {metaConns.length === 0 && (
                  <>
                    <button onClick={() => setShowMetaForm(s => !s)} style={{
                      width: '100%', height: 38, borderRadius: 8,
                      background: showMetaForm ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #1877F2 0%, #0C5CC7 100%)',
                      border: showMetaForm ? `1px solid ${T.border}` : 'none',
                      color: showMetaForm ? T.text2 : '#fff', fontSize: 13, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      cursor: 'pointer', boxShadow: showMetaForm ? 'none' : '0 4px 14px rgba(24,119,242,0.35)',
                    }}>
                      <MetaLogo size={16} />
                      {showMetaForm ? 'Cancelar' : 'Adicionar conta Meta'}
                    </button>

                    {showMetaForm && (
                      <div style={{ marginTop: 10, background: T.bgRaised, border: `1px solid rgba(24,119,242,0.2)`, borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ fontSize: 11, color: T.text2, display: 'block', marginBottom: 5 }}>Apelido (opcional)</label>
                          <FInput value={metaApelido} onChange={setMetaApelido} placeholder="Ex: BM Principal" />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ fontSize: 11, color: T.text2, display: 'block', marginBottom: 5 }}>
                            Access Token <span style={{ fontSize: 10, color: T.text3 }}>(Gerenciador de Negócios → Usuários do Sistema)</span>
                          </label>
                          <FSecret value={metaToken} onChange={setMetaToken} placeholder="Cole o token aqui" />
                        </div>
                        {metaTestMsg && (
                          <div style={{ marginBottom: 10, padding: '7px 10px', borderRadius: 6, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", background: metaTestState === 'ok' ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.06)', border: `1px solid ${metaTestState === 'ok' ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`, color: metaTestState === 'ok' ? T.green : T.red, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {metaTestState === 'ok' ? <CheckCircle size={11} /> : <XCircle size={11} />}{metaTestMsg}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={handleTestMeta} disabled={metaTestState === 'testing'} style={{ height: 32, padding: '0 14px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: `1px solid ${metaTestState === 'ok' ? 'rgba(16,185,129,0.3)' : T.border}`, color: metaTestState === 'ok' ? T.green : T.text2, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Wifi size={12} />{metaTestState === 'testing' ? 'Testando...' : metaTestState === 'ok' ? 'OK ✓' : 'Testar'}
                          </button>
                          <button onClick={handleSaveMeta} disabled={savingMeta} style={{ height: 32, padding: '0 16px', borderRadius: 7, background: 'linear-gradient(135deg, #1877F2, #0C5CC7)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                            {savingMeta ? 'Salvando...' : 'Salvar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {metaConns.length > 0 && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {metaConns.map(conn => (
                      <button key={conn.id} onClick={() => handleSyncMeta(conn)} disabled={syncingMeta === conn.fb_user_id} style={{ flex: 1, height: 34, borderRadius: 8, background: 'rgba(24,119,242,0.08)', border: '1px solid rgba(24,119,242,0.2)', color: '#1877F2', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}>
                        <RefreshCw size={12} style={{ animation: syncingMeta === conn.fb_user_id ? 'spin 1s linear infinite' : 'none' }} />
                        Sincronizar
                      </button>
                    ))}
                    <button onClick={() => setShowMetaForm(s => !s)} style={{ height: 34, padding: '0 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, color: T.text3, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                      <Plus size={12} /> Nova conta
                    </button>
                  </div>
                )}
              </div>

              {/* Contas Meta expandidas */}
              {expandMeta && metaConns.length > 0 && (
                <div style={{ borderTop: `1px solid ${T.borderSub}` }}>
                  {metaConns.map(conn => (
                    <div key={conn.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: T.bgRaised, borderBottom: `1px solid ${T.borderSub}` }}>
                        <MetaLogo size={14} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: T.text1 }}>{conn.fb_user_name}</span>
                        <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono', monospace" }}>ID {conn.fb_user_id}</span>
                        <div style={{ flex: 1 }} />
                        <button onClick={() => handleDisconnectMeta(conn)} style={{ width: 24, height: 24, borderRadius: 5, background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', color: T.red, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                      {metaAccs.map(acc => (
                        <AccountRow key={acc.id} nome={acc.nome} id={acc.account_id} balance={acc.balance} currency={acc.currency} status={acc.status} warn={(acc.balance ?? 0) < 20} />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Em breve */}
        <div>
          <p style={{ fontSize: 11, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 12 }}>Em breve</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { name: 'Google Ads', desc: 'Sincronize campanhas do Google Search e YouTube Ads.', color: '#4285F4' },
              { name: 'Kwai Ads', desc: 'Conecte suas contas do Kwai Ads para vídeos curtos.', color: '#FF6B35' },
              { name: 'Taboola', desc: 'Integração com native ads via Taboola.', color: '#4B9B4B' },
            ].map(p => (
              <div key={p.name} style={{ background: T.bgSurface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '16px 18px', opacity: 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${p.color}15`, border: `1px solid ${p.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: p.color }}>{p.name[0]}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text2 }}>{p.name}</div>
                    <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 20, background: 'rgba(100,116,139,0.1)', color: T.text3 }}>EM BREVE</span>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: T.text3 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
      <style>{sharedStyles}</style>
    </div>
  )
}
