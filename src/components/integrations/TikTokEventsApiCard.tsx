'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle, Eye, EyeOff, Save, Trash2, Zap } from 'lucide-react'
import { useWorkspaceStore } from '@/store/workspace'
import { H, Panel, StatusPill } from '@/components/hawk/ui'

type Integration = {
  id: string
  name: string
  pixel_code: string
  advertiser_id: string | null
  enabled: boolean
  token_mask: string | null
  updated_at: string
}

function TikTokLogo() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
    </svg>
  )
}

export function TikTokEventsApiCard() {
  const { active: workspace } = useWorkspaceStore()
  const [integration, setIntegration] = useState<Integration | null>(null)
  const [name, setName] = useState('TikTok Events API')
  const [pixel, setPixel] = useState('')
  const [advertiser, setAdvertiser] = useState('')
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    if (!workspace?.id) return
    setLoading(true)
    try {
      const r = await fetch(`/api/integrations/tiktok-events?workspace_id=${encodeURIComponent(workspace.id)}`, { cache: 'no-store' })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || 'Falha ao carregar')
      const item = j.integration as Integration | null
      setIntegration(item)
      if (item) {
        setName(item.name || 'TikTok Events API')
        setPixel(item.pixel_code || '')
        setAdvertiser(item.advertiser_id || '')
      }
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Falha ao carregar integração' })
    } finally {
      setLoading(false)
    }
  }, [workspace?.id])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!workspace?.id) return
    if (!pixel.trim()) return setMsg({ ok: false, text: 'Informe o Pixel ID.' })
    if (!integration && !token.trim()) return setMsg({ ok: false, text: 'Informe o Access Token.' })

    setSaving(true); setMsg(null)
    try {
      const r = await fetch('/api/integrations/tiktok-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          name,
          pixel_code: pixel,
          advertiser_id: advertiser || null,
          access_token: token,
          enabled: true,
        }),
      })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || 'Falha ao salvar')
      setToken('')
      setMsg({ ok: true, text: 'Integração salva. O sender deste workspace já pode usar estas credenciais.' })
      await load()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Falha ao salvar' })
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!workspace?.id || !integration?.id) return
    if (!confirm('Remover a integração TikTok Events API deste workspace?')) return
    const r = await fetch('/api/integrations/tiktok-events', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspace.id, id: integration.id }),
    })
    const j = await r.json()
    if (!j.ok) return setMsg({ ok: false, text: j.error || 'Falha ao remover' })
    setIntegration(null); setPixel(''); setAdvertiser(''); setToken('')
    setMsg({ ok: true, text: 'Integração removida. O sender volta a usar ENV enquanto elas existirem.' })
  }

  return (
    <Panel>
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', color: '#f4f5ff', background: 'radial-gradient(circle at 35% 30%, rgba(220,222,253,.30), rgba(133,139,230,.45) 55%, rgba(75,80,130,.55))', border: '1px solid rgba(220,222,253,.2)' }}>
            <TikTokLogo />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="tt-h">TikTok Events API</span>
              <StatusPill tone={integration ? 'good' : 'neutral'}>{integration ? 'Configurado no Tiotrack' : 'Usando ENV / pendente'}</StatusPill>
            </div>
            <p style={{ fontSize: 12, color: H.muted, marginTop: 4, lineHeight: 1.5 }}>
              Credenciais do Pixel usadas pelo sender server-side de Purchase. O token é criptografado antes de ir para o banco.
            </p>
          </div>
          <Zap size={16} color={integration ? H.green : H.muted} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          <label>
            <span style={{ display: 'block', fontSize: 11.5, color: H.sub, marginBottom: 6 }}>Nome</span>
            <input className="tt-input" value={name} onChange={e => setName(e.target.value)} placeholder="TikTok principal" />
          </label>
          <label>
            <span style={{ display: 'block', fontSize: 11.5, color: H.sub, marginBottom: 6 }}>Pixel ID</span>
            <input className="tt-input tt-mono" value={pixel} onChange={e => setPixel(e.target.value)} placeholder="Ex: D7FT..." />
          </label>
        </div>

        <label style={{ display: 'block', marginTop: 10 }}>
          <span style={{ display: 'block', fontSize: 11.5, color: H.sub, marginBottom: 6 }}>Advertiser ID <span style={{ color: H.muted }}>· opcional</span></span>
          <input className="tt-input tt-mono" value={advertiser} onChange={e => setAdvertiser(e.target.value)} placeholder="Conta de anúncio" />
        </label>

        <label style={{ display: 'block', marginTop: 10 }}>
          <span style={{ display: 'block', fontSize: 11.5, color: H.sub, marginBottom: 6 }}>
            Access Token {integration?.token_mask && <span style={{ color: H.muted }}>· salvo {integration.token_mask}</span>}
          </span>
          <div style={{ position: 'relative' }}>
            <input
              className="tt-input tt-mono"
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder={integration ? 'Deixe vazio para manter o token atual' : 'Cole o token da Events API'}
              style={{ paddingRight: 38 }}
            />
            <button type="button" onClick={() => setShowToken(v => !v)} className="tt-icon-btn" style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28 }}>
              {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </label>

        {msg && (
          <div className="tt-mono" style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, background: msg.ok ? 'rgba(116,211,171,.07)' : 'rgba(240,137,155,.07)', border: `1px solid ${msg.ok ? 'rgba(116,211,171,.2)' : 'rgba(240,137,155,.2)'}`, color: msg.ok ? H.green : H.red }}>
            <CheckCircle size={11} />{msg.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="tt-btn tt-btn-primary" onClick={save} disabled={saving || loading}>
            <Save size={12} />{saving ? 'Salvando...' : integration ? 'Salvar alterações' : 'Salvar integração'}
          </button>
          {integration && (
            <button className="tt-btn" onClick={remove}>
              <Trash2 size={12} />Remover
            </button>
          )}
        </div>
      </div>
    </Panel>
  )
}
