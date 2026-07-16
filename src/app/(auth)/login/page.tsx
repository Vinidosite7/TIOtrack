'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, Loader2, Zap, ShieldCheck, Link2, Radio, Target } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LampEffect, FloatingOrbs } from '@/components/ui/aceternity'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [show, setShow]         = useState(false)
  const [focused, setFocused]   = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou senha incorretos.'); setLoading(false); return }
    router.push('/overview')
  }

  const iw = (field: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '11px 14px', borderRadius: 12,
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${focused === field ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
    boxShadow: focused === field ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
    transition: 'all 150ms',
  })

  const ib: React.CSSProperties = {
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    fontSize: 14, color: '#E2E8F0', fontFamily: 'inherit',
  }

  const lb: React.CSSProperties = {
    fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.08em',
  }

  const KPIS = [
    { l: 'Caixa hoje', v: 'R$ 8.420', c: '#34D399', t: 'PIX + cartão' },
    { l: 'Ads',        v: 'R$ 2.100', c: '#F87171', t: 'Meta + TikTok' },
    { l: 'ROAS',       v: '4.01x',    c: '#60A5FA', t: 'operação viva'},
  ]
  const BARS   = [20,35,28,55,42,70,48,82,58,91,65,100]
  const ACTS   = [
    { n: 'Venda atribuída · TikTok', v: 'R$ 97',  p: true,  t: '2min'  },
    { n: 'PIX aguardando · Meta',    v: 'R$ 47',  p: false, t: '8min'  },
    { n: 'Campanha escalando',       v: 'R$ 197', p: true,  t: '15min' },
  ]
  const FEATURES = [
    { icon: Radio, label: 'Vendas ao vivo', text: 'caixa, pendências e fontes' },
    { icon: Target, label: 'Campanhas', text: 'ROAS por TikTok e Meta' },
    { icon: Link2, label: 'UTMs', text: 'atribuição sem chute' },
  ]

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'#05080F', fontFamily:'Inter, system-ui, sans-serif', overflowX:'hidden' }}>

      {/* LEFT */}
      <FloatingOrbs/>
      <div style={{ width:'54%', display:'none', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', padding:'48px 56px', borderRight:'1px solid rgba(255,255,255,0.05)', background:'radial-gradient(ellipse 120% 100% at 50% 110%, rgba(59,130,246,0.05) 0%, #05080F 55%)' }} className="auth-left">

        {/* Dot grid */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', backgroundImage:'radial-gradient(circle, rgba(59,130,246,0.08) 1px, transparent 1px)', backgroundSize:'28px 28px', maskImage:'radial-gradient(ellipse 75% 70% at 50% 40%, black, transparent)', WebkitMaskImage:'radial-gradient(ellipse 75% 70% at 50% 40%, black, transparent)' }}/>

        {/* Orbs */}
        <div style={{ position:'absolute', top:'-10%', left:'-10%', width:600, height:600, pointerEvents:'none', background:'radial-gradient(circle at center, rgba(59,130,246,0.1) 0%, transparent 60%)', filter:'blur(50px)', animation:'orb-a 20s ease-in-out infinite' }}/>
        <div style={{ position:'absolute', bottom:'-10%', right:'-5%', width:400, height:400, pointerEvents:'none', background:'radial-gradient(circle at center, rgba(16,185,129,0.08) 0%, transparent 60%)', filter:'blur(40px)', animation:'orb-b 25s ease-in-out infinite' }}/>

        {/* Logo */}
        <div style={{ position:'relative', zIndex:1, alignSelf:'flex-start', display:'flex', alignItems:'center', gap:10, marginBottom:32 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg, #3B82F6, #6366F1)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(59,130,246,0.4)' }}>
            <Zap size={16} color="#fff"/>
          </div>
          <span style={{ fontSize:18, fontWeight:800, color:'#fff', letterSpacing:'-0.03em' }}>TioTrack</span>
        </div>

        {/* Headline */}
        <div style={{ position:'relative', zIndex:1, textAlign:'center', maxWidth:460, marginBottom:40 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 14px', borderRadius:999, marginBottom:20, background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.15)' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#34D399', boxShadow:'0 0 6px #34D399' }}/>
            <span style={{ fontSize:11, fontWeight:700, color:'#34D399', letterSpacing:'0.04em' }}>Operação conectada · tráfego e vendas no mesmo pulso</span>
          </div>
          <h2 style={{ fontSize:38, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.1, color:'#F1F5F9', margin:'0 0 14px' }}>
            Caixa, ads e{' '}
            <span style={{ background:'linear-gradient(135deg, #3B82F6, #60A5FA)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>ROAS</span>
            {' '}sem planilha
          </h2>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.3)', lineHeight:1.7, margin:0 }}>
            TioTrack junta TikTok Ads, Meta Ads, vendas e UTMs para o gestor saber onde cortar, onde escalar e onde o dinheiro está preso.
          </p>
        </div>

        {/* Dashboard mock */}
        <motion.div animate={{ y:[0,-10,0] }} transition={{ duration:6, repeat:Infinity, ease:'easeInOut' }} style={{ position:'relative', zIndex:1, width:'100%', maxWidth:480 }}>
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:360, height:300, pointerEvents:'none', background:'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 65%)', filter:'blur(30px)' }}/>
          <div style={{ borderRadius:18, overflow:'hidden', background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', boxShadow:'0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.06)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(255,255,255,0.02)' }}>
              <div style={{ display:'flex', gap:5 }}>{['#F87171','#FBBF24','#34D399'].map(c=><div key={c} style={{ width:9, height:9, borderRadius:'50%', background:c, opacity:0.7 }}/>)}</div>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.2)', fontWeight:600 }}>TioTrack · Sala de comando</span>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:'#34D399', boxShadow:'0 0 5px #34D399' }}/>
                <span style={{ fontSize:9, color:'#34D399' }}>ao vivo</span>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              {KPIS.map(({ l,v,c,t },i)=>(
                <div key={l} style={{ padding:'12px 14px', borderRight:i<2?'1px solid rgba(255,255,255,0.04)':'none' }}>
                  <p style={{ fontSize:8, color:'rgba(255,255,255,0.2)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>{l}</p>
                  <p style={{ fontSize:14, fontWeight:700, color:c, margin:'0 0 2px', textShadow:`0 0 12px ${c}44` }}>{v}</p>
                  <p style={{ fontSize:9, color:`${c}88`, margin:0 }}>{t}</p>
                </div>
              ))}
            </div>
            <div style={{ padding:'14px 16px 12px' }}>
              <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:48, marginBottom:8 }}>
                {BARS.map((h,i)=><div key={i} style={{ flex:1, borderRadius:'2px 2px 0 0', height:`${h}%`, background:i===11?'linear-gradient(180deg, #60A5FA, #3B82F6)':`rgba(59,130,246,${0.06+i*0.04})`, boxShadow:i===11?'0 0 8px rgba(59,130,246,0.5)':'none' }}/>)}
              </div>
              <p style={{ fontSize:9, color:'rgba(255,255,255,0.15)', margin:0 }}>Caixa vs mídia — últimos 14 dias</p>
            </div>
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.04)', padding:'10px 16px 14px' }}>
              <p style={{ fontSize:9, color:'rgba(255,255,255,0.2)', margin:'0 0 8px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Sinais da operação</p>
              {ACTS.map((a,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:i<2?'1px solid rgba(255,255,255,0.03)':'none' }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:a.p?'#34D399':'#FBBF24', boxShadow:`0 0 4px ${a.p?'#34D399':'#FBBF24'}` }}/>
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.4)', flex:1 }}>{a.n}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:a.p?'#34D399':'#FBBF24', fontFamily:'monospace' }}>{a.v}</span>
                  <span style={{ fontSize:9, color:'rgba(255,255,255,0.15)' }}>{a.t}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <p style={{ position:'relative', zIndex:1, fontSize:11, color:'rgba(255,255,255,0.1)', margin:'32px 0 0' }}>© 2026 TioTrack · Feito no Brasil 🇧🇷</p>
      </div>

      {/* RIGHT */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', padding:'48px 32px', background:'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(59,130,246,0.03) 0%, transparent 70%)' }}>
        <div style={{ position:'absolute', top:'15%', right:'-5%', width:280, height:280, pointerEvents:'none', background:'radial-gradient(circle at center, rgba(59,130,246,0.06) 0%, transparent 65%)', filter:'blur(30px)', animation:'orb-b 22s ease-in-out infinite' }}/>

        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, ease:[0.16,1,0.3,1] }} style={{ position:'relative', width:'100%', maxWidth:360, display:'flex', flexDirection:'column', gap:24 }}>

          {/* Logo mobile */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }} className="auth-logo-mobile">
            <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg, #3B82F6, #6366F1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Zap size={14} color="#fff"/>
            </div>
            <span style={{ fontSize:16, fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>TioTrack</span>
          </div>

          <LampEffect color="#3b82f6">
            <div style={{ textAlign: 'center', paddingTop: 20, paddingBottom: 8 }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'5px 10px', borderRadius:999, background:'rgba(59,130,246,0.10)', border:'1px solid rgba(59,130,246,0.18)', color:'#93C5FD', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
                <ShieldCheck size={12}/> acesso seguro
              </div>
              <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.03em', color:'#f0f0ff', marginBottom:8, lineHeight:1.1, fontFamily:"'Syne', sans-serif" }}>Entrar na sala de comando</h1>
              <p style={{ fontSize:14, color:'rgba(255,255,255,0.34)', lineHeight:1.5, fontFamily:"'DM Sans', sans-serif" }}>Veja receita, gasto, ROAS, UTMs e integrações sem abrir cinco abas.</p>
            </div>
          </LampEffect>

          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              <label style={lb}>E-mail</label>
              <div style={iw('email')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={focused==='email'?'#60A5FA':'rgba(255,255,255,0.2)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <input type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} required style={ib} onFocus={()=>setFocused('email')} onBlur={()=>setFocused('')}/>
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              <label style={lb}>Senha</label>
              <div style={iw('password')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={focused==='password'?'#60A5FA':'rgba(255,255,255,0.2)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input type={show?'text':'password'} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required style={ib} onFocus={()=>setFocused('password')} onBlur={()=>setFocused('')}/>
                <button type="button" onClick={()=>setShow(v=>!v)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.2)', padding:0, display:'flex', flexShrink:0 }}>
                  {show?<EyeOff size={14}/>:<Eye size={14}/>}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, fontSize:13, background:'rgba(248,113,113,0.07)', border:'1px solid rgba(248,113,113,0.18)', color:'#F87171' }}>
                  ⚠ {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button type="submit" disabled={loading} whileHover={!loading?{scale:1.015}:{}} whileTap={!loading?{scale:0.975}:{}} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'13px 16px', borderRadius:12, marginTop:4, background:loading?'rgba(59,130,246,0.15)':'linear-gradient(135deg, #3B82F6, #2563EB)', color:loading?'rgba(255,255,255,0.3)':'#fff', fontWeight:700, fontSize:14, border:'none', cursor:loading?'not-allowed':'pointer', boxShadow:loading?'none':'0 0 32px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.15)', transition:'all 200ms' }}>
              {loading?<Loader2 size={15} style={{ animation:'spin 1s linear infinite' }}/>:<><span>Abrir dashboard</span><ArrowRight size={15}/></>}
            </motion.button>
          </form>

          <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:8 }}>
            {FEATURES.map(({ icon: Icon, label, text }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:14, background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.065)' }}>
                <div style={{ width:30, height:30, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(59,130,246,0.10)', border:'1px solid rgba(59,130,246,0.18)', color:'#60A5FA', flexShrink:0 }}>
                  <Icon size={14}/>
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12, color:'#E2E8F0', fontWeight:800, fontFamily:"'DM Sans', sans-serif" }}>{label}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.28)', fontFamily:"'DM Sans', sans-serif" }}>{text}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes orb-a { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,-30px) scale(1.08)} }
        @keyframes orb-b { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-30px,40px) scale(0.93)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media (min-width:1024px) { .auth-left{display:flex !important} .auth-logo-mobile{display:none !important} }
        input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus {
          -webkit-box-shadow:0 0 0 1000px #05080F inset !important;
          -webkit-text-fill-color:#E2E8F0 !important;
          caret-color:#E2E8F0 !important;
        }
      `}</style>
    </div>
  )
}
