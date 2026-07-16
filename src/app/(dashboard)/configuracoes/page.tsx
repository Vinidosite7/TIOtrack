'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  User, Zap, Bell, Shield, LogOut,
  Save, ChevronRight, Key, Check, Eye, EyeOff,
  Smartphone, Copy, Webhook, Target,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkspaceStore } from '@/store/workspace'
import { SpotlightCard, ShimmerButton, GlowCorner } from '@/components/ui/aceternity'

// ─── Tokens (idênticos ao BossFlow) ──────────────────────────
const T = {
  bg: 'rgba(8,8,14,0.92)', bgDeep: 'rgba(6,6,10,0.97)',
  border: 'rgba(255,255,255,0.055)', borderP: 'rgba(59,130,246,0.3)',
  text: '#dcdcf0', sub: '#8a8aaa', muted: '#4a4a6a',
  green: '#10b981', amber: '#f59e0b', blue: '#3b82f6',
  red: '#ef4444', cyan: '#22d3ee', violet: '#60a5fa', blur: 'blur(20px)',
}
const card = {
  background: T.bg, border: `1px solid ${T.border}`,
  backdropFilter: T.blur,
  boxShadow: '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)',
}
const inp: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`,
  color: T.text, borderRadius: 12, padding: '10px 14px', fontSize: 13,
  outline: 'none', width: '100%', transition: 'border-color 0.15s',
  fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box',
}
const lbl: React.CSSProperties = {
  fontSize: 11, color: T.muted, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  marginBottom: 6, display: 'block', fontFamily: "'Syne', sans-serif",
}
const focusIn  = (e: any) => e.currentTarget.style.borderColor = T.borderP
const focusOut = (e: any) => e.currentTarget.style.borderColor = T.border
const fadeUp   = (delay = 0) => ({
  initial: { opacity: 0, y: 16, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.46, delay, ease: [0.16, 1, 0.3, 1] as const },
})

const TABS = [
  { key: 'perfil',    label: 'Perfil',       icon: User    },
  { key: 'workspace', label: 'Workspace',    icon: Zap     },
  { key: 'notif',     label: 'Alertas',      icon: Bell    },
  { key: 'seguranca', label: 'Segurança',    icon: Shield  },
]

// ─── Toggle ───────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.9 }} onClick={onChange}
      style={{
        position: 'relative', width: 44, height: 24, borderRadius: 99,
        background: on ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'rgba(255,255,255,0.08)',
        boxShadow: on ? '0 0 14px rgba(59,130,246,0.45)' : 'none',
        border: `1px solid ${on ? 'rgba(59,130,246,0.3)' : T.border}`,
        cursor: 'pointer', transition: 'background 0.2s, box-shadow 0.2s',
        flexShrink: 0,
      }}>
      <motion.div animate={{ x: on ? 20 : 2 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}/>
    </motion.button>
  )
}

function ConfigSignal({ icon: Icon, label, value, detail, color }: {
  icon: React.ElementType
  label: string
  value: string
  detail: string
  color: string
}) {
  return (
    <div style={{
      padding: 14,
      borderRadius: 12,
      background: 'rgba(255,255,255,0.025)',
      border: `1px solid ${T.border}`,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}12`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={13} color={color}/>
        </div>
        <span style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, fontFamily: "'Syne', sans-serif" }}>{label}</span>
      </div>
      <p style={{ fontSize: 22, color: T.text, fontFamily: "'Syne', sans-serif", fontWeight: 800, lineHeight: 1, marginBottom: 6 }}>{value}</p>
      <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.45, fontFamily: "'DM Sans', sans-serif" }}>{detail}</p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────
export default function ConfiguracoesPage() {
  const router = useRouter()
  const { active: workspace, setActive, list } = useWorkspaceStore()

  const [isMobile, setIsMobile] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('perfil')
  const [userAuth, setUserAuth] = useState<any>(null)
  const [saved, setSaved]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [copied, setCopied]     = useState(false)
  const [showPass, setShowPass] = useState({ new: false, confirm: false })

  // Forms
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '', phone: '' })
  const [wsForm, setWsForm]           = useState({ nome: '', moeda: 'BRL' })
  const [metaMensal, setMetaMensal]   = useState('')
  const [passForm, setPassForm]       = useState({ new: '', confirm: '' })
  const [alertas, setAlertas]         = useState({
    saldo_baixo: true,
    meta_risco: true,
    token_expirando: true,
    resumo_diario: false,
  })

  const webhookUrl = workspace?.id
    ? `https://tiotrack.vercel.app/api/webhook?wid=${workspace.id}`
    : ''

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 820)
    fn(); window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    setUserAuth(user)
    setProfileForm({
      full_name: user.user_metadata?.full_name || '',
      email: user.email || '',
      phone: user.user_metadata?.phone || '',
    })
    if (workspace?.id) {
      setWsForm({ nome: workspace.nome, moeda: workspace.moeda || 'BRL' })
      const { data } = await supabase.from('user_prefs').select('*').eq('workspace_id', workspace.id).single()
      if (data) setMetaMensal(String(data.meta_mensal_brl ?? ''))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [workspace?.id])

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 2200) }

  async function saveProfile() {
    setSaving(true)
    await supabase.auth.updateUser({ data: { full_name: profileForm.full_name } })
    flash(); setSaving(false)
  }

  async function saveWorkspace() {
    if (!workspace?.id) return
    setSaving(true)
    await supabase.from('workspaces').update({ nome: wsForm.nome, moeda: wsForm.moeda }).eq('id', workspace.id)
    await (supabase as any).from('user_prefs').upsert({
      workspace_id: workspace.id,
      meta_mensal_brl: metaMensal ? parseFloat(metaMensal) : null,
    }, { onConflict: 'workspace_id' })
    setActive({ ...workspace, nome: wsForm.nome, moeda: wsForm.moeda })
    flash(); setSaving(false)
  }

  async function savePassword() {
    if (passForm.new !== passForm.confirm) return alert('As senhas não coincidem')
    if (passForm.new.length < 6) return alert('Mínimo 6 caracteres')
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: passForm.new })
    if (error) alert(error.message)
    else { flash(); setPassForm({ new: '', confirm: '' }) }
    setSaving(false)
  }

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const initials = profileForm.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    || userAuth?.email?.charAt(0)?.toUpperCase() || '?'
  const metaNumber = metaMensal ? Number(metaMensal) : 0
  const metaDaily = metaNumber > 0 ? metaNumber / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() : 0
  const alertCount = Object.values(alertas).filter(Boolean).length
  const setupScore = [
    Boolean(profileForm.full_name),
    Boolean(workspace?.id),
    metaNumber > 0,
    Boolean(webhookUrl),
  ].filter(Boolean).length

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '24px 20px' }}>
      {[180, 320].map(h => (
        <div key={h} style={{ height: h, borderRadius: 16, background: 'rgba(255,255,255,0.04)', animation: 'sk 1.4s ease-in-out infinite', backgroundSize: '200% 100%' }}/>
      ))}
      <style>{`@keyframes sk{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  )

  return (
    <div style={{ padding: isMobile ? '16px 12px 88px' : '24px 20px', maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <motion.div {...fadeUp(0)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: T.text, letterSpacing: '-0.03em', margin: 0 }}>Configurações</h1>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>Controle meta, webhook, alertas e segurança do painel</p>
        </div>
        <AnimatePresence>
          {saved && (
            <motion.div initial={{ opacity: 0, scale: 0.9, x: 10 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: `${T.green}12`, color: T.green, border: `1px solid ${T.green}28`, fontFamily: "'DM Sans', sans-serif" }}>
              <Check size={14}/> Salvo!
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div {...fadeUp(0.04)} style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(280px, 1.05fr) repeat(3, minmax(0, 0.72fr))',
        gap: 12,
        alignItems: 'stretch',
      }}>
        <div style={{
          padding: 18,
          borderRadius: 16,
          background: 'linear-gradient(145deg, rgba(59,130,246,0.13), rgba(167,139,250,0.07) 55%, rgba(8,8,14,0.22))',
          border: `1px solid ${T.border}`,
          minHeight: 148,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: 10, color: T.violet, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 800, marginBottom: 10 }}>
              Centro de controle
            </p>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: isMobile ? 19 : 22, lineHeight: 1.12, color: T.text, margin: 0, letterSpacing: '-0.02em' }}>
              {setupScore >= 4 ? 'Seu painel está pronto para operar.' : 'Faltam poucos ajustes para o painel trabalhar sozinho.'}
            </h2>
            <p style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.55, marginTop: 8, fontFamily: "'DM Sans', sans-serif" }}>
              Meta mensal, webhook e alertas alimentam as decisões que aparecem no overview, vendas e campanhas.
            </p>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{ width: `${(setupScore / 4) * 100}%`, height: '100%', borderRadius: 99, background: setupScore >= 4 ? T.green : T.blue, boxShadow: `0 0 12px ${setupScore >= 4 ? T.green : T.blue}66` }}/>
            </div>
            <p style={{ fontSize: 11, color: T.muted, marginTop: 7, fontFamily: "'DM Sans', sans-serif" }}>{setupScore}/4 pontos essenciais configurados</p>
          </div>
        </div>

        <ConfigSignal icon={Target} label="Meta mensal" value={metaNumber > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(metaNumber) : '—'} detail={metaDaily > 0 ? `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(metaDaily)}/dia` : 'defina uma meta para ativar projeções'} color={T.violet}/>
        <ConfigSignal icon={Webhook} label="Webhook" value={webhookUrl ? 'Ativo' : '—'} detail={webhookUrl ? 'checkout pode enviar vendas' : 'workspace necessário'} color={T.amber}/>
        <ConfigSignal icon={Bell} label="Alertas" value={`${alertCount}`} detail="preferências ligadas no painel" color={T.green}/>
      </motion.div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>

        {/* Sidebar de tabs — desktop */}
        <motion.div {...fadeUp(0.08)} style={{ width: 200, flexShrink: 0, display: 'none' }} className="config-sidebar">
          <SpotlightCard style={{ ...card, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {TABS.map(({ key, label, icon: Icon }) => {
                const active = tab === key
                return (
                  <motion.button key={key} whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setTab(key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderRadius: 10, fontSize: 13, width: '100%', textAlign: 'left', cursor: 'pointer',
                      background: active ? 'rgba(59,130,246,0.12)' : 'transparent',
                      color: active ? T.violet : T.muted,
                      border: `1px solid ${active ? 'rgba(59,130,246,0.25)' : 'transparent'}`,
                      fontFamily: "'DM Sans', sans-serif", fontWeight: active ? 600 : 400,
                      transition: 'all 0.15s',
                    }}>
                    <Icon size={14}/>
                    <span style={{ flex: 1 }}>{label}</span>
                    {active && <ChevronRight size={12}/>}
                  </motion.button>
                )
              })}
              <div style={{ height: 1, background: T.border, margin: '4px 8px' }}/>
              <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }} onClick={handleLogout}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, fontSize: 13, width: '100%', textAlign: 'left', cursor: 'pointer', color: T.red, background: 'transparent', border: 'none', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = `${T.red}0a`}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <LogOut size={14}/>
                <span>Sair</span>
              </motion.button>
            </div>
          </SpotlightCard>
        </motion.div>

        {/* Tab bar mobile */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, width: '100%', flexShrink: 0 }} className="config-tabs-mobile">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, flexShrink: 0, cursor: 'pointer', background: tab === key ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)', color: tab === key ? T.violet : T.muted, border: `1px solid ${tab === key ? 'rgba(59,130,246,0.25)' : T.border}`, fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s' }}>
              <Icon size={12}/>{label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}
            style={{ flex: 1, minWidth: 0 }}>
            <SpotlightCard style={{ ...card, borderRadius: 16 }}>

              {/* ── PERFIL ── */}
              {tab === 'perfil' && (
                <div style={{ padding: 24 }}>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 20 }}>Dados pessoais</h2>

                  {/* Avatar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(99,102,241,0.25))', border: '1px solid rgba(59,130,246,0.3)', color: T.violet, fontFamily: "'Syne', sans-serif", boxShadow: '0 0 28px rgba(59,130,246,0.15)', flexShrink: 0 }}>
                      <GlowCorner color="rgba(59,130,246,0.2)" position="bottom-right"/>
                      {initials}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>{profileForm.full_name || 'Seu nome'}</p>
                      <p style={{ fontSize: 12, color: T.muted, fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>{userAuth?.email}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, boxShadow: `0 0 6px ${T.green}` }}/>
                        <span style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>Conta ativa</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={lbl}>Nome completo</label>
                      <input value={profileForm.full_name} onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })} placeholder="Seu nome completo" style={inp} onFocus={focusIn} onBlur={focusOut}/>
                    </div>
                    <div>
                      <label style={lbl}>Email</label>
                      <input value={profileForm.email} disabled style={{ ...inp, opacity: 0.45, cursor: 'not-allowed' }}/>
                      <p style={{ fontSize: 11, color: T.muted, marginTop: 6, fontFamily: "'DM Sans', sans-serif" }}>O email não pode ser alterado por aqui</p>
                    </div>
                    <ShimmerButton onClick={saveProfile} disabled={saving}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white', boxShadow: '0 0 24px rgba(59,130,246,0.35)', border: '1px solid rgba(255,255,255,0.1)', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, alignSelf: 'flex-start' }}>
                      {saving ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }}/> : <Save size={14}/>}
                      Salvar perfil
                    </ShimmerButton>
                  </div>
                </div>
              )}

              {/* ── WORKSPACE ── */}
              {tab === 'workspace' && (
                <div style={{ padding: 24 }}>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 20 }}>Dados do workspace</h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={lbl}>Nome do workspace</label>
                      <input value={wsForm.nome} onChange={e => setWsForm({ ...wsForm, nome: e.target.value })} placeholder="Ex: Op VN" style={inp} onFocus={focusIn} onBlur={focusOut}/>
                    </div>
                    <div>
                      <label style={lbl}>Moeda</label>
                      <select value={wsForm.moeda} onChange={e => setWsForm({ ...wsForm, moeda: e.target.value })}
                        style={{ ...inp, appearance: 'none' as const }}>
                        <option value="BRL">BRL — Real Brasileiro</option>
                        <option value="USD">USD — Dólar Americano</option>
                        <option value="EUR">EUR — Euro</option>
                      </select>
                    </div>

                    {/* Meta mensal */}
                    <div style={{ padding: 16, borderRadius: 12, background: 'rgba(59,130,246,0.04)', border: `1px solid rgba(59,130,246,0.12)` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Target size={14} style={{ color: T.violet }}/>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>Meta mensal de receita</p>
                          <p style={{ fontSize: 11, color: T.muted, marginTop: 3, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.45 }}>
                            Usada no overview, sidebar e alertas de ritmo do mês.
                          </p>
                        </div>
                        {metaDaily > 0 && (
                          <span style={{ fontSize: 11, color: T.violet, background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.22)', borderRadius: 999, padding: '4px 9px', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(metaDaily)}/dia
                          </span>
                        )}
                      </div>
                      <input value={metaMensal} onChange={e => setMetaMensal(e.target.value)} type="number" placeholder="Ex: 10000" style={inp} onFocus={focusIn} onBlur={focusOut}/>
                    </div>

                    {/* Webhook */}
                    <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Webhook size={14} style={{ color: T.amber }}/>
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>URL do Webhook</p>
                          <p style={{ fontSize: 11, color: T.muted, marginTop: 3, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.45 }}>
                            Use no checkout para enviar vendas, PIX, reembolsos e UTMs.
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input readOnly value={webhookUrl} style={{ ...inp, flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, opacity: 0.7 }}/>
                        <button onClick={copyWebhook}
                          style={{ padding: '10px 14px', borderRadius: 10, background: copied ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${copied ? 'rgba(16,185,129,0.25)' : T.border}`, color: copied ? T.green : T.muted, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>
                          {copied ? <><Check size={13}/> Copiado</> : <><Copy size={13}/> Copiar</>}
                        </button>
                      </div>
                    </div>

                    <ShimmerButton onClick={saveWorkspace} disabled={saving}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white', boxShadow: '0 0 24px rgba(59,130,246,0.35)', border: '1px solid rgba(255,255,255,0.1)', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, alignSelf: 'flex-start' }}>
                      {saving ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }}/> : <Save size={14}/>}
                      Salvar workspace
                    </ShimmerButton>
                  </div>
                </div>
              )}

              {/* ── ALERTAS ── */}
              {tab === 'notif' && (
                <div style={{ padding: 24 }}>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 20 }}>Alertas automáticos</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { key: 'saldo_baixo',    label: 'Saldo baixo nos BCs',     desc: 'Alerta quando saldo TikTok ou Meta ficar abaixo de R$100',  color: T.amber },
                      { key: 'meta_risco',     label: 'Meta em risco',           desc: 'Avisa quando o ritmo indica que a meta não será batida',    color: T.red   },
                      { key: 'token_expirando',label: 'Token Meta expirando',    desc: 'Notifica quando o token do Meta Ads está prestes a expirar', color: T.violet },
                      { key: 'resumo_diario',  label: 'Resumo diário',           desc: 'Receba um resumo automático todo dia às 20h',                color: T.green  },
                    ].map(({ key, label, desc, color }) => (
                      <motion.div key={key} whileHover={{ x: 2 }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: `1px solid ${T.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, marginTop: 6, flexShrink: 0 }}/>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>{label}</p>
                            <p style={{ fontSize: 11, color: T.muted, marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>{desc}</p>
                          </div>
                        </div>
                        <Toggle on={alertas[key as keyof typeof alertas]} onChange={() => setAlertas({ ...alertas, [key]: !alertas[key as keyof typeof alertas] })}/>
                      </motion.div>
                    ))}
                    <ShimmerButton onClick={flash}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white', boxShadow: '0 0 24px rgba(59,130,246,0.35)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', alignSelf: 'flex-start', marginTop: 4 }}>
                      <Save size={14}/> Salvar preferências
                    </ShimmerButton>
                  </div>
                </div>
              )}

              {/* ── SEGURANÇA ── */}
              {tab === 'seguranca' && (
                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: T.text }}>Segurança</h2>

                  {/* Alterar senha */}
                  <SpotlightCard spotlightColor="rgba(59,130,246,0.1)"
                    style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${T.border}`, borderRadius: 12, backdropFilter: 'blur(8px)' }}>
                    <div style={{ padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Key size={13} style={{ color: T.violet }}/>
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>Alterar senha</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {(['new', 'confirm'] as const).map(f => (
                          <div key={f}>
                            <label style={lbl}>{f === 'new' ? 'Nova senha' : 'Confirmar senha'}</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, padding: '0 12px', transition: 'border-color 0.15s' }}
                              onFocus={() => {}} ref={null}>
                              <input type={showPass[f] ? 'text' : 'password'} value={passForm[f]}
                                onChange={e => setPassForm({ ...passForm, [f]: e.target.value })}
                                placeholder={f === 'new' ? 'Mínimo 6 caracteres' : 'Repita a senha'}
                                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '10px 0', fontSize: 13, color: T.text, fontFamily: "'DM Sans', sans-serif" }}
                                onFocus={e => (e.currentTarget.parentElement!.style.borderColor = T.borderP)}
                                onBlur={e => (e.currentTarget.parentElement!.style.borderColor = T.border)}/>
                              <motion.button whileTap={{ scale: 0.9 }} type="button"
                                onClick={() => setShowPass(p => ({ ...p, [f]: !p[f] }))}
                                style={{ color: T.muted, cursor: 'pointer', background: 'none', border: 'none', display: 'flex' }}>
                                {showPass[f] ? <EyeOff size={14}/> : <Eye size={14}/>}
                              </motion.button>
                            </div>
                          </div>
                        ))}
                        <ShimmerButton onClick={savePassword} disabled={saving || !passForm.new}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white', boxShadow: '0 0 24px rgba(59,130,246,0.35)', border: '1px solid rgba(255,255,255,0.1)', cursor: (saving || !passForm.new) ? 'not-allowed' : 'pointer', opacity: (saving || !passForm.new) ? 0.5 : 1, alignSelf: 'flex-start' }}>
                          {saving ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }}/> : <Key size={14}/>}
                          Atualizar senha
                        </ShimmerButton>
                      </div>
                    </div>
                  </SpotlightCard>

                  {/* Sessão atual */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Smartphone size={14} style={{ color: T.cyan }}/>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>Sessão atual</p>
                      <p style={{ fontSize: 11, color: T.muted, marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>{userAuth?.email} · Última atividade agora</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, animation: 'pulse 2s infinite' }}/>
                      <span style={{ fontSize: 11, color: T.green, fontFamily: "'DM Sans', sans-serif" }}>Ativo</span>
                    </div>
                  </div>

                  {/* Danger zone */}
                  <div style={{ padding: 16, borderRadius: 12, background: `${T.red}06`, border: `1px solid ${T.red}18` }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: T.red, fontFamily: "'Syne', sans-serif", marginBottom: 4 }}>Zona de perigo</p>
                    <p style={{ fontSize: 12, color: T.muted, fontFamily: "'DM Sans', sans-serif", marginBottom: 16 }}>Ações irreversíveis. Proceda com cuidado.</p>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleLogout}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: `${T.red}12`, color: T.red, border: `1px solid ${T.red}25`, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                      <LogOut size={14}/> Sair da conta
                    </motion.button>
                  </div>
                </div>
              )}

            </SpotlightCard>
          </motion.div>
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @media (min-width: 640px) {
          .config-sidebar  { display: block !important; }
          .config-tabs-mobile { display: none !important; }
        }
      `}</style>
    </div>
  )
}
