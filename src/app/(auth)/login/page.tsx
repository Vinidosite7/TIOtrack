'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// barras decorativas (formato do gráfico "Desempenho por tempo")
const BARS = [22, 30, 26, 38, 18, 44, 36, 52, 40, 58, 48, 64, 42, 70, 56, 76, 60, 82, 68, 90, 74, 86, 80, 95]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou senha incorretos.'); setLoading(false); return }
    router.push('/overview')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, position: 'relative', overflow: 'hidden' }}>
      <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '46vh', display: 'flex', alignItems: 'flex-end', gap: '0.8vw', padding: '0 4vw', opacity: .22, maskImage: 'linear-gradient(180deg, transparent, black 70%)', WebkitMaskImage: 'linear-gradient(180deg, transparent, black 70%)' }}>
        {BARS.map((h, i) => <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '6px 6px 0 0', background: 'linear-gradient(180deg,#f2f3ff,#7e84dc)' }} />)}
      </div>

      <div className="tt-card" style={{ width: 'min(100%, 400px)', padding: 28, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="26" height="22" viewBox="0 0 26 22" aria-hidden>
            <defs><linearGradient id="lg-logo" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#eef0ff" /><stop offset="100%" stopColor="#8c91ea" /></linearGradient></defs>
            <path d="M1 3h24l-4 5h-6l-3 13-4.5-3L10 8H5z" fill="url(#lg-logo)" />
          </svg>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '.02em', fontStyle: 'italic', color: '#eceefb' }}>TIO<span style={{ color: '#a3a7f2', fontWeight: 600 }}>TRACK</span></span>
        </div>
        <h1 style={{ fontSize: 22, marginTop: 22, color: '#eceefb' }}>Entrar na central</h1>
        <p style={{ color: '#666c8e', fontSize: 13, marginTop: 6 }}>Tráfego, campanhas, vendas e funil no mesmo painel.</p>

        <form onSubmit={handleLogin} style={{ display: 'grid', gap: 12, marginTop: 22 }}>
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 11.5, color: '#9ea3c2', marginBottom: 6 }}>Email</span>
            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#666c8e' }} />
              <input className="tt-input" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" style={{ paddingLeft: 34, minHeight: 42 }} />
            </div>
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 11.5, color: '#9ea3c2', marginBottom: 6 }}>Senha</span>
            <div style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#666c8e' }} />
              <input className="tt-input" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ paddingLeft: 34, paddingRight: 38, minHeight: 42 }} />
              <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#666c8e', display: 'flex' }}>{show ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </div>
          </label>
          {error && <div role="alert" style={{ fontSize: 12.5, color: '#f0899b', padding: '8px 10px', borderRadius: 8, background: 'rgba(240,137,155,.07)', border: '1px solid rgba(240,137,155,.2)' }}>{error}</div>}
          <button type="submit" className="tt-btn tt-btn-primary" disabled={loading} style={{ minHeight: 44, marginTop: 4, fontSize: 14 }}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <>Entrar <ArrowRight size={15} /></>}
          </button>
        </form>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 20, color: '#666c8e', fontSize: 11.5 }}>
          <span className="tt-status-dot hk-live-dot" style={{ background: '#74d3ab' }} /> Operation Control Center
        </div>
      </div>
    </div>
  )
}
