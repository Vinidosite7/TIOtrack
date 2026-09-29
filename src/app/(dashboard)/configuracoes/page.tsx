'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Zap, Bell, Shield, LogOut, Save, Key, Check, Eye, EyeOff, Smartphone, Copy, Webhook, Target, ListChecks } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useWorkspaceStore } from '@/store/workspace'
import { usePush } from '@/hooks/usePush'
import { H, Panel, KpiCard, PageHeader, StatusPill, Toggle } from '@/components/hawk/ui'

const TABS = [
  { key: 'perfil',    label: 'Perfil',    icon: User   },
  { key: 'workspace', label: 'Workspace', icon: Zap    },
  { key: 'notif',     label: 'Alertas',   icon: Bell   },
  { key: 'seguranca', label: 'Segurança', icon: Shield },
]
const brl2 = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 11.5, color: H.sub, marginBottom: 6 }}>{label}</span>
      {children}
      {hint && <span style={{ display: 'block', fontSize: 11, color: H.muted, marginTop: 6 }}>{hint}</span>}
    </label>
  )
}
function SaveBtn({ onClick, saving, disabled, children }: { onClick: () => void; saving?: boolean; disabled?: boolean; children: React.ReactNode }) {
  return <button className="tt-btn tt-btn-primary" onClick={onClick} disabled={saving || disabled} style={{ alignSelf: 'flex-start', opacity: saving || disabled ? 0.6 : 1 }}>{saving ? <span style={{ width: 13, height: 13, borderRadius: 99, border: '2px solid rgba(17,20,42,.3)', borderTopColor: '#11142a', animation: 'spin .8s linear infinite' }} /> : <Save size={14} />}{children}</button>
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const { active: workspace, setActive, list } = useWorkspaceStore()
  const push = usePush()

  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('perfil')
  const [userAuth, setUserAuth] = useState<any>(null)
  const [saved, setSaved]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [copied, setCopied]     = useState(false)
  const [pushTesting, setPushTesting] = useState(false)
  const [pushMessage, setPushMessage] = useState('')
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
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://tiotrack.vercel.app'}/api/webhook?wid=${workspace.id}`
    : ''

  // Preferências de alerta ficam salvas por workspace neste aparelho
  useEffect(() => {
    if (!workspace?.id) return
    try { const raw = localStorage.getItem(`tt-alertas-${workspace.id}`); if (raw) setAlertas(a => ({ ...a, ...JSON.parse(raw) })) } catch {}
  }, [workspace?.id])
  function saveAlertas() {
    try { if (workspace?.id) localStorage.setItem(`tt-alertas-${workspace.id}`, JSON.stringify(alertas)) } catch {}
    flash()
  }

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

  async function handlePushToggle() {
    if (!workspace?.id) return
    setPushMessage('')
    const ok = push.subscribed
      ? (await push.unsubscribe(workspace.id), true)
      : await push.subscribe(workspace.id)
    setPushMessage(ok ? (push.subscribed ? 'Notificações desativadas neste aparelho.' : 'Notificações ativadas neste aparelho.') : 'Não foi possível ativar. No iPhone, abra pelo app instalado na Tela de Início.')
  }

  async function sendTestPush() {
    if (!workspace?.id) return
    setPushTesting(true)
    setPushMessage('')
    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          title: '⚡ TioTrack ativo',
          body: 'Teste enviado. Quando uma venda aprovar, o alerta chega por aqui.',
          url: '/vendas',
        }),
      })
      const json = await res.json()
      setPushMessage(json?.sent > 0 ? `Teste enviado para ${json.sent} aparelho(s).` : 'Nenhum aparelho inscrito ainda. Ative as notificações primeiro.')
    } catch {
      setPushMessage('Falha ao enviar teste. Confira as chaves VAPID na Vercel.')
    } finally {
      setPushTesting(false)
    }
  }

  const initials = profileForm.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    || userAuth?.email?.charAt(0)?.toUpperCase() || '?'
  const metaNumber = metaMensal ? Number(metaMensal) : 0
  const metaDaily = metaNumber > 0 ? metaNumber / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() : 0
  const alertCount = Object.values(alertas).filter(Boolean).length
  const pushStatus = !push.supported
    ? 'Indisponível'
    : push.subscribed
      ? 'Ativo'
      : push.permission === 'denied'
        ? 'Bloqueado'
        : 'Desativado'
  const pushDetail = !push.supported
    ? 'no iPhone, instale o site na Tela de Início e abra pelo app'
    : push.subscribed
      ? 'este aparelho recebe alertas de venda'
      : push.permission === 'denied'
        ? 'permissão negada no navegador/sistema'
        : 'ative neste aparelho para receber vendas'
  const setupScore = [
    Boolean(profileForm.full_name),
    Boolean(workspace?.id),
    metaNumber > 0,
    Boolean(webhookUrl),
  ].filter(Boolean).length


  if (loading) return <div className="shell-page"><div className="tt-card" style={{ height: 320, opacity: .5 }} /></div>

  return (
    <div className="shell-page" style={{ maxWidth: 1180 }}>
      <PageHeader title="Configurações" sub="Perfil, workspace, meta mensal, webhook, alertas e segurança"
        right={saved ? <span className="tt-badge" style={{ color: H.green }}><Check size={13} /> Salvo</span> : undefined} />

      <div className="tt-grid-4" style={{ marginBottom: 12, gap: 12 }}>
        <KpiCard icon={ListChecks} label="Configuração" value={`${setupScore}/4`} foot={setupScore >= 4 ? 'tudo pronto' : 'faltam ajustes'} progress={setupScore / 4} />
        <KpiCard icon={Target} label="Meta mensal" value={metaNumber > 0 ? brl2(metaNumber) : '—'} foot={metaDaily > 0 ? `${brl2(metaDaily)}/dia` : 'defina para ativar projeções'} progress={metaNumber > 0 ? 1 : 0} />
        <KpiCard icon={Webhook} label="Webhook" value={webhookUrl ? 'Ativo' : '—'} foot={webhookUrl ? 'checkout pode enviar vendas' : 'workspace necessário'} progress={webhookUrl ? 1 : 0} />
        <KpiCard icon={Bell} label="Push" value={pushStatus} foot={pushDetail} progress={push.subscribed ? 1 : 0.15} />
      </div>

      <Panel>
        <div style={{ padding: '6px 18px 0' }}>
          <div className="tt-tabbar no-scrollbar" style={{ borderBottom: 0 }}>
            {TABS.map(({ key, label, icon: Icon }) => <button key={key} className="tt-tab" data-active={tab === key} onClick={() => setTab(key)}><Icon size={14} />{label}</button>)}
          </div>
        </div>
        <div style={{ height: 1, background: H.line }} />

        {tab === 'perfil' && (
          <div style={{ padding: 22, display: 'grid', gap: 18, maxWidth: 560 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: 999, display: 'grid', placeItems: 'center', fontSize: 19, fontWeight: 800, color: '#11142a', background: 'radial-gradient(circle at 35% 30%, #dcdefd 0%, #8c91ea 70%)', boxShadow: '0 0 0 3px rgba(11,13,24,1), 0 0 0 4px rgba(163,167,242,.35)' }}>{initials}</div>
              <div>
                <div style={{ color: H.text, fontWeight: 700, fontSize: 15 }}>{profileForm.full_name || 'Seu nome'}</div>
                <div style={{ color: H.muted, fontSize: 12, marginTop: 2 }}>{userAuth?.email}</div>
                <div style={{ marginTop: 6 }}><StatusPill tone="good">Conta ativa</StatusPill></div>
              </div>
            </div>
            <Field label="Nome completo"><input className="tt-input" value={profileForm.full_name} onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })} placeholder="Seu nome completo" /></Field>
            <Field label="Email" hint="O email não pode ser alterado por aqui"><input className="tt-input" value={profileForm.email} disabled style={{ opacity: .5, cursor: 'not-allowed' }} /></Field>
            <SaveBtn onClick={saveProfile} saving={saving}>Salvar perfil</SaveBtn>
          </div>
        )}

        {tab === 'workspace' && (
          <div style={{ padding: 22, display: 'grid', gap: 18, maxWidth: 680 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12 }}>
              <Field label="Nome do workspace"><input className="tt-input" value={wsForm.nome} onChange={e => setWsForm({ ...wsForm, nome: e.target.value })} placeholder="Ex: Op VN" /></Field>
              <Field label="Moeda">
                <select className="tt-select" value={wsForm.moeda} onChange={e => setWsForm({ ...wsForm, moeda: e.target.value })}>
                  <option value="BRL">BRL — Real</option><option value="USD">USD — Dólar</option><option value="EUR">EUR — Euro</option>
                </select>
              </Field>
            </div>
            <div className="tt-inset" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                <div><div style={{ color: H.text, fontWeight: 700, fontSize: 13 }}>Meta mensal de receita</div><div style={{ color: H.muted, fontSize: 11.5, marginTop: 3 }}>Usada nas projeções e alertas de ritmo do mês</div></div>
                {metaDaily > 0 && <span className="tt-chip">{brl2(metaDaily)}/dia</span>}
              </div>
              <input className="tt-input" value={metaMensal} onChange={e => setMetaMensal(e.target.value)} type="number" placeholder="Ex: 10000" />
            </div>
            <div className="tt-inset" style={{ padding: 16 }}>
              <div style={{ color: H.text, fontWeight: 700, fontSize: 13 }}>URL do webhook</div>
              <div style={{ color: H.muted, fontSize: 11.5, marginTop: 3, marginBottom: 12 }}>Cole no checkout/SharkBot para enviar vendas, PIX, reembolsos e UTMs</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="tt-input tt-mono" readOnly value={webhookUrl} style={{ fontSize: 11.5, color: H.sub }} />
                <button className="tt-btn" onClick={copyWebhook} style={{ flexShrink: 0, color: copied ? H.green : undefined }}>{copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}</button>
              </div>
            </div>
            <SaveBtn onClick={saveWorkspace} saving={saving}>Salvar workspace</SaveBtn>
          </div>
        )}

        {tab === 'notif' && (
          <div style={{ padding: 22, display: 'grid', gap: 12, maxWidth: 760 }}>
            <div className="tt-inset" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 240 }}>
                  <Smartphone size={18} color={push.subscribed ? H.green : H.lav} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ color: H.text, fontWeight: 700, fontSize: 13.5 }}>Push no celular e navegador</span><StatusPill tone={push.subscribed ? 'good' : push.permission === 'denied' ? 'bad' : 'neutral'}>{pushStatus}</StatusPill></div>
                    <div style={{ color: H.muted, fontSize: 12, marginTop: 5, lineHeight: 1.5 }}>Venda aprovada, PIX importante e alertas da operação — {pushDetail}.</div>
                    <div style={{ color: H.muted, fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>iPhone: Safari → compartilhar → “Adicionar à Tela de Início”, abra pelo ícone e ative aqui.</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className={push.subscribed ? 'tt-btn' : 'tt-btn tt-btn-primary'} onClick={handlePushToggle} disabled={!workspace?.id || push.loading || (!push.supported && typeof window !== 'undefined')}>{push.loading ? 'Aguarde...' : push.subscribed ? 'Desativar' : 'Ativar neste aparelho'}</button>
                  <button className="tt-btn" onClick={sendTestPush} disabled={!workspace?.id || pushTesting}>{pushTesting ? 'Enviando...' : 'Enviar teste'}</button>
                </div>
              </div>
              {pushMessage && <div style={{ marginTop: 12, color: H.sub, fontSize: 12 }}>{pushMessage}</div>}
            </div>
            {[
              { key: 'saldo_baixo', label: 'Saldo baixo nas contas', desc: 'Quando o saldo TikTok ou Meta ficar abaixo do limite' },
              { key: 'meta_risco', label: 'Meta em risco', desc: 'Quando o ritmo indicar que a meta do mês não será batida' },
              { key: 'token_expirando', label: 'Integração pedindo atenção', desc: 'Quando um token ou conexão precisar ser renovado' },
              { key: 'resumo_diario', label: 'Resumo diário', desc: 'Resumo automático da operação no fim do dia' },
            ].map(({ key, label, desc }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 2px', borderBottom: `1px solid ${H.lineSoft}` }}>
                <div><div style={{ color: H.text, fontSize: 13, fontWeight: 600 }}>{label}</div><div style={{ color: H.muted, fontSize: 11.5, marginTop: 2 }}>{desc}</div></div>
                <Toggle label={label} on={alertas[key as keyof typeof alertas]} onChange={() => setAlertas({ ...alertas, [key]: !alertas[key as keyof typeof alertas] })} />
              </div>
            ))}
            <div style={{ marginTop: 6 }}><SaveBtn onClick={saveAlertas}>Salvar preferências</SaveBtn></div>
          </div>
        )}

        {tab === 'seguranca' && (
          <div style={{ padding: 22, display: 'grid', gap: 16, maxWidth: 560 }}>
            <PanelHeadInline icon={Key} title="Alterar senha" />
            {(['new', 'confirm'] as const).map(f => (
              <Field key={f} label={f === 'new' ? 'Nova senha' : 'Confirmar senha'}>
                <div style={{ position: 'relative' }}>
                  <input className="tt-input" type={showPass[f] ? 'text' : 'password'} value={passForm[f]} onChange={e => setPassForm({ ...passForm, [f]: e.target.value })} placeholder={f === 'new' ? 'Mínimo 6 caracteres' : 'Repita a senha'} style={{ paddingRight: 36 }} />
                  <button type="button" onClick={() => setShowPass(p => ({ ...p, [f]: !p[f] }))} aria-label="Mostrar senha" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: H.muted, display: 'flex' }}>{showPass[f] ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                </div>
              </Field>
            ))}
            {passForm.confirm && passForm.new !== passForm.confirm && <div style={{ color: H.red, fontSize: 12 }}>As senhas não coincidem</div>}
            <SaveBtn onClick={savePassword} saving={saving} disabled={!passForm.new || passForm.new !== passForm.confirm}>Atualizar senha</SaveBtn>

            <div className="tt-inset" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
              <Smartphone size={16} color={H.lav} />
              <div style={{ flex: 1 }}><div style={{ color: H.text, fontSize: 13, fontWeight: 600 }}>Sessão atual</div><div style={{ color: H.muted, fontSize: 11.5, marginTop: 2 }}>{userAuth?.email}</div></div>
              <StatusPill tone="good">Ativa</StatusPill>
            </div>
            <div style={{ padding: 14, borderRadius: 12, border: '1px solid rgba(240,137,155,.2)', background: 'rgba(240,137,155,.04)' }}>
              <div style={{ color: H.red, fontWeight: 700, fontSize: 13 }}>Sair da conta</div>
              <div style={{ color: H.muted, fontSize: 12, margin: '4px 0 12px' }}>Encerra a sessão neste aparelho.</div>
              <button className="tt-btn" onClick={handleLogout} style={{ color: H.red, borderColor: 'rgba(240,137,155,.25)' }}><LogOut size={14} /> Sair</button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  )
}

function PanelHeadInline({ icon: Icon, title }: { icon: any; title: string }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: H.text, fontWeight: 700, fontSize: 14 }}><Icon size={15} color={H.lav} />{title}</div>
}
