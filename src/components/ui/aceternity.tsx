'use client'

import { useRef, useState, useEffect, useCallback, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─────────────────────────────────────────────────────────────────
// ACETERNITY UI — BossFlow edition
// Mesmos exports que o original, efeitos elevados
// ─────────────────────────────────────────────────────────────────

export function AcernityFonts() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');

      /* Reset de fonte global — mantém Inter do Tailwind */
      *, *::before, *::after { box-sizing: border-box; }

      /* Scrollbar ultra-fina roxa */
      ::-webkit-scrollbar { width: 3px; height: 3px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb {
        background: rgba(124,110,247,0.25);
        border-radius: 99px;
      }
      ::-webkit-scrollbar-thumb:hover { background: rgba(124,110,247,0.5); }

      /* Date picker dark */
      input[type="date"]::-webkit-calendar-picker-indicator {
        filter: invert(0.45) sepia(1) hue-rotate(200deg) saturate(0.8);
        cursor: pointer;
        opacity: 0.6;
      }
      input[type="number"]::-webkit-inner-spin-button,
      input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; }

      /* ── Keyframes ── */

      /* Shimmer sweep suave */
      @keyframes shimmer-sweep {
        0%   { transform: translateX(-100%) skewX(-12deg); }
        100% { transform: translateX(220%) skewX(-12deg); }
      }

      /* Skeleton wave */
      @keyframes sk-wave {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      /* Orb flutuação suave */
      @keyframes orb-drift-a {
        0%,100% { transform: translate(0px,  0px)  scale(1);    }
        30%     { transform: translate(22px, -28px) scale(1.07); }
        60%     { transform: translate(-14px, 18px) scale(0.95); }
      }
      @keyframes orb-drift-b {
        0%,100% { transform: translate(0px,   0px)  scale(1);    }
        40%     { transform: translate(-24px, 22px) scale(1.09); }
        70%     { transform: translate(16px, -12px) scale(0.94); }
      }
      @keyframes orb-drift-c {
        0%,100% { transform: translate(0px,  0px)  scale(1);   }
        50%     { transform: translate(18px, -18px) scale(1.04); }
      }

      /* Live dot */
      @keyframes live-ring {
        0%   { transform: scale(1);   opacity: 0.9; }
        100% { transform: scale(2.6); opacity: 0; }
      }

      /* Card border scan line */
      @keyframes border-scan {
        0%   { background-position: 0% 0%;   }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 0%;   }
      }

      /* Glowing Effect — rotating conic border */
      @keyframes glow-rotate {
        0%   { --glow-angle: 0deg; }
        100% { --glow-angle: 360deg; }
      }
      @property --glow-angle {
        syntax: '<angle>';
        initial-value: 0deg;
        inherits: false;
      }

      /* Sparkles twinkle */
      @keyframes sparkle-in {
        0%   { transform: scale(0) rotate(0deg);   opacity: 0; }
        50%  { transform: scale(1) rotate(180deg);  opacity: 1; }
        100% { transform: scale(0) rotate(360deg);  opacity: 0; }
      }

      /* Background beams drift */
      @keyframes beam-move {
        0%   { transform: translateX(-120%) rotate(var(--beam-angle, 35deg)); opacity: 0; }
        10%  { opacity: 1; }
        90%  { opacity: 1; }
        100% { transform: translateX(250%) rotate(var(--beam-angle, 35deg)); opacity: 0; }
      }

      /* Floating dock item hover */
      @keyframes dock-pop {
        0%,100% { transform: scale(1); }
        50%      { transform: scale(1.15); }
      }

      /* Loader ring */
      @keyframes loader-spin {
        to { transform: rotate(360deg); }
      }
      @keyframes loader-pulse {
        0%,100% { opacity: 1; transform: scale(1); }
        50%      { opacity: 0.4; transform: scale(0.88); }
      }

      /* Ripple */
      @keyframes ripple-expand {
        0%   { transform: scale(0.5); opacity: 0.6; }
        100% { transform: scale(4);   opacity: 0;   }
      }

      /* Bento card hover shimmer */
      @keyframes bento-shimmer {
        0%   { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }

      /* Noise background shift */
      @keyframes noise-shift {
        0%,100% { background-position: 0 0; }
        25%      { background-position: 4px -4px; }
        50%      { background-position: -4px 4px; }
        75%      { background-position: 4px 4px; }
      }

      /* Colourful text gradient slide */
      @keyframes colour-slide {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      /* Text hover SVG stroke fill */
      @keyframes stroke-fill {
        from { stroke-dashoffset: var(--path-length, 1000); }
        to   { stroke-dashoffset: 0; }
      }
    `}</style>
  )
}

// ─── BackgroundGrid ─────────────────────────────────────────────
// Dot grid + dupla vignette. Nenhuma mudança na API.
export function BackgroundGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>

      {/* Dot grid — pontos roxos muito suaves */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage:
          'radial-gradient(circle, rgba(124,110,247,0.10) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        /* máscara radial: visível no centro, some nas bordas */
        maskImage:
          'radial-gradient(ellipse 85% 80% at 50% 42%, black 25%, transparent 100%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 85% 80% at 50% 42%, black 25%, transparent 100%)',
      }} />

      {/* Vignette geral */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background:
          'radial-gradient(ellipse 130% 100% at 50% -10%, transparent 35%, rgba(5,5,12,0.65) 100%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}

// ─── FloatingOrbs ───────────────────────────────────────────────
// Três orbs com animações independentes e blur diferenciado.
export function FloatingOrbs() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
    }}>
      {/* Orb roxo — top-left */}
      <div style={{
        position: 'absolute', top: -180, left: -100,
        width: 580, height: 580, borderRadius: '50%',
        background:
          'radial-gradient(circle at 40% 40%, rgba(124,110,247,0.09) 0%, transparent 60%)',
        animation: 'orb-drift-a 18s ease-in-out infinite',
        filter: 'blur(1px)',
      }} />

      {/* Orb esmeralda — bottom-right */}
      <div style={{
        position: 'absolute', bottom: -220, right: -140,
        width: 660, height: 660, borderRadius: '50%',
        background:
          'radial-gradient(circle at 60% 60%, rgba(52,211,153,0.065) 0%, transparent 60%)',
        animation: 'orb-drift-b 22s ease-in-out infinite',
        filter: 'blur(1px)',
      }} />

      {/* Orb roxo-claro — centro-direita, mais sutil */}
      <div style={{
        position: 'absolute', top: '30%', right: '5%',
        width: 340, height: 340, borderRadius: '50%',
        background:
          'radial-gradient(circle, rgba(157,110,247,0.04) 0%, transparent 70%)',
        animation: 'orb-drift-c 28s ease-in-out infinite',
      }} />
    </div>
  )
}

// ─── SpotlightCard ──────────────────────────────────────────────
// Spotlight radial seguindo o mouse + grain texture inline + top shimmer on hover.
// API idêntica ao original.
interface SpotlightCardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  spotlightColor?: string
}

export function SpotlightCard({
  children,
  className = '',
  style = {},
  spotlightColor = 'rgba(124,110,247,0.13)',
}: SpotlightCardProps) {
  const ref     = useRef<HTMLDivElement>(null)
  const [pos, setPos]       = useState({ x: -9999, y: -9999 })
  const [hovered, setHovered] = useState(false)

  const onMove = useCallback((e: MouseEvent) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const enter = () => setHovered(true)
    const leave = () => { setHovered(false); setPos({ x: -9999, y: -9999 }) }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseenter', enter)
    el.addEventListener('mouseleave', leave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseenter', enter)
      el.removeEventListener('mouseleave', leave)
    }
  }, [onMove])

  // cor de borda realçada no hover
  const borderHover = hovered
    ? `1px solid rgba(124,110,247,0.22)`
    : (style.border as string | undefined) || '1px solid rgba(255,255,255,0.06)'

  return (
    <div
      ref={ref}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style,
        border: borderHover,
        boxShadow: hovered
          ? `${(style.boxShadow as string) || ''}, 0 0 0 1px rgba(124,110,247,0.08)`
          : style.boxShadow as string | undefined,
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* ① Spotlight radial */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
        background: `radial-gradient(280px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 68%)`,
        transition: hovered ? 'none' : 'background 0.4s ease',
        borderRadius: 'inherit',
      }} />

      {/* ② Grain noise — textura matte premium */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
        borderRadius: 'inherit',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.045'/%3E%3C/svg%3E")`,
        backgroundSize: '140px 140px',
        mixBlendMode: 'overlay',
        opacity: 0.75,
      }} />

      {/* ③ Top shimmer line — aparece no hover */}
      <div style={{
        position: 'absolute', top: 0, left: '8%', right: '8%',
        height: '1px', zIndex: 4, pointerEvents: 'none',
        background: hovered
          ? `linear-gradient(90deg, transparent, ${spotlightColor.replace(/[\d.]+\)$/, '0.55)')}, transparent)`
          : 'transparent',
        transition: 'background 0.3s ease',
        borderRadius: 'inherit',
      }} />

      {/* ④ Bottom glow accent ao hover */}
      <div style={{
        position: 'absolute', bottom: 0, left: '20%', right: '20%',
        height: '1px', zIndex: 4, pointerEvents: 'none',
        background: hovered
          ? `linear-gradient(90deg, transparent, rgba(124,110,247,0.18), transparent)`
          : 'transparent',
        transition: 'background 0.3s ease',
      }} />

      {/* Conteúdo */}
      <div style={{ position: 'relative', zIndex: 5 }}>{children}</div>
    </div>
  )
}

// ─── ShimmerButton ──────────────────────────────────────────────
// Varredura de luz + inner top highlight + scale suave.
// API idêntica ao original.
interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export function ShimmerButton({
  children,
  className = '',
  style = {},
  ...props
}: ShimmerButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.022, filter: 'brightness(1.08)' }}
      whileTap={{ scale: 0.972 }}
      {...(props as any)}
      className={`relative overflow-hidden ${className}`}
      style={{
        cursor: 'pointer',
        transition: 'box-shadow 0.22s ease',
        ...style,
      }}
    >
      {/* Shimmer sweep — varredura diagonal única */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 0, bottom: 0,
          left: '-60%',
          width: '45%',
          background:
            'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
          animation: 'shimmer-sweep 2.6s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Inner top highlight */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 0, left: '8%', right: '8%',
          height: '1px',
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Conteúdo */}
      <span style={{
        position: 'relative', zIndex: 2,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {children}
      </span>
    </motion.button>
  )
}

// ─── Skeleton ───────────────────────────────────────────────────
export function Skeleton({
  className = '',
  style = {},
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={className}
      style={{
        background: `linear-gradient(
          90deg,
          rgba(13,13,20,0.9) 0%,
          rgba(26,20,46,0.85) 40%,
          rgba(22,18,36,0.9) 60%,
          rgba(13,13,20,0.9) 100%
        )`,
        backgroundSize: '400% 100%',
        animation: 'sk-wave 1.7s ease-in-out infinite',
        ...style,
      }}
    />
  )
}

// ─── StatBar ────────────────────────────────────────────────────
// Barra animada com glow — usada na seção de Performance.
// Não estava no original mas é exportada para uso interno no page.
export function StatBar({
  value,
  max,
  color,
  delay = 0.4,
}: {
  value: number
  max: number
  color: string
  delay?: number
}) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100)
  return (
    <div style={{
      height: 3, borderRadius: 99,
      background: 'rgba(255,255,255,0.06)',
      overflow: 'hidden', position: 'relative',
    }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute', left: 0, top: 0,
          height: '100%', borderRadius: 99,
          background: `linear-gradient(90deg, ${color}, ${color}bb)`,
          boxShadow: `0 0 10px ${color}70`,
        }}
      />
    </div>
  )
}

// ─── LiveDot ────────────────────────────────────────────────────
// Dot pulsante para o header (re-exportado para manter imports limpos).
export function LiveDot({ color = '#34d399' }: { color?: string }) {
  return (
    <span style={{
      position: 'relative', display: 'inline-flex',
      width: 8, height: 8, flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%', background: color,
        animation: 'live-ring 1.65s ease-out infinite',
      }} />
      <span style={{
        position: 'relative',
        width: 8, height: 8, borderRadius: '50%',
        background: color,
        boxShadow: `0 0 7px ${color}`,
        display: 'inline-flex',
      }} />
    </span>
  )
}

// ─── GlowCorner ─────────────────────────────────────────────────
// Orb de glow posicionado em canto de card KPI.
export function GlowCorner({
  color,
  position = 'bottom-right',
}: {
  color: string
  position?: 'bottom-right' | 'bottom-left' | 'top-right'
}) {
  const pos: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: -24, right: -24 },
    'bottom-left':  { bottom: -24, left:  -24 },
    'top-right':    { top:    -24, right: -24  },
  }
  return (
    <div style={{
      position: 'absolute',
      width: 130, height: 130, borderRadius: '50%',
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      filter: 'blur(18px)',
      pointerEvents: 'none', zIndex: 0,
      ...pos[position],
    }} />
  )
}

// ═══════════════════════════════════════════════════════════════
// NEW ACETERNITY COMPONENTS — BossFlow edition
// ═══════════════════════════════════════════════════════════════

// ─── GlowingEffect ──────────────────────────────────────────────
// Borda com gradiente cônico rotativo. Envolve qualquer card.
// Uso: <GlowingEffect><div className="...">conteúdo</div></GlowingEffect>
export function GlowingEffect({
  children,
  className = '',
  color = '#7c6ef7',
  spread = 36,
  blur = 14,
  disabled = false,
}: {
  children: React.ReactNode
  className?: string
  color?: string
  spread?: number
  blur?: number
  disabled?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [angle, setAngle] = useState(0)
  const [hovered, setHovered] = useState(false)
  const raf = useRef<number>(0)

  useEffect(() => {
    if (!hovered || disabled) return
    const start = performance.now()
    function tick(now: number) {
      setAngle(((now - start) / 3000) * 360)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [hovered, disabled])

  const gradient = `conic-gradient(from ${angle}deg at 50% 50%, transparent 0deg, ${color}cc ${spread}deg, transparent ${spread * 2}deg)`

  return (
    <div
      ref={ref}
      className={className}
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Rotating glow border */}
      {!disabled && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: -1,
            borderRadius: 'inherit',
            background: gradient,
            filter: `blur(${blur}px)`,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.4s ease',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>{children}</div>
    </div>
  )
}

// ─── Sparkles ───────────────────────────────────────────────────
// Partículas sparkle que aparecem ao redor de um elemento.
// Uso: <Sparkles><span>R$ 12.840</span></Sparkles>
interface SparkleParticle {
  id: number; x: number; y: number; size: number; color: string; delay: number; duration: number
}

const SPARKLE_COLORS = ['#7c6ef7', '#a78bfa', '#34d399', '#fbbf24', '#f0e6ff']

function generateSparkle(): SparkleParticle {
  return {
    id: Math.random(),
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 4 + Math.random() * 8,
    color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
    delay: Math.random() * 0.8,
    duration: 0.6 + Math.random() * 0.6,
  }
}

export function Sparkles({
  children,
  count = 6,
  className = '',
}: {
  children: React.ReactNode
  count?: number
  className?: string
}) {
  const [sparkles, setSparkles] = useState<SparkleParticle[]>([])
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!active) return
    const initial = Array.from({ length: count }, generateSparkle)
    setSparkles(initial)
    const interval = setInterval(() => {
      setSparkles(Array.from({ length: count }, generateSparkle))
    }, 700)
    return () => clearInterval(interval)
  }, [active, count])

  return (
    <span
      className={className}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => { setActive(false); setSparkles([]) }}
    >
      <AnimatePresence>
        {sparkles.map(s => (
          <motion.span
            key={s.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: s.duration, delay: s.delay, ease: 'easeOut' }}
            aria-hidden
            style={{
              position: 'absolute',
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <svg width={s.size} height={s.size} viewBox="0 0 16 16" fill="none">
              <path
                d="M8 0 L9 7 L16 8 L9 9 L8 16 L7 9 L0 8 L7 7 Z"
                fill={s.color}
                style={{ filter: `drop-shadow(0 0 3px ${s.color})` }}
              />
            </svg>
          </motion.span>
        ))}
      </AnimatePresence>
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </span>
  )
}

// ─── EncryptedText ──────────────────────────────────────────────
// Efeito de texto scramble que "decifra" ao montar ou hover.
// Uso: <EncryptedText text="R$ 12.840" />
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&'

export function EncryptedText({
  text,
  duration = 1200,
  className = '',
  style = {},
  trigger = 'mount',
}: {
  text: string
  duration?: number
  className?: string
  style?: React.CSSProperties
  trigger?: 'mount' | 'hover'
}) {
  const [display, setDisplay] = useState(trigger === 'mount' ? text.replace(/[^\s]/g, () => CHARS[Math.floor(Math.random() * CHARS.length)]) : text)
  const [running, setRunning] = useState(false)

  const run = useCallback(() => {
    if (running) return
    setRunning(true)
    const steps = 18
    let step = 0
    const interval = setInterval(() => {
      step++
      const progress = step / steps
      setDisplay(
        text.split('').map((char, i) => {
          if (char === ' ') return ' '
          if (i / text.length < progress) return char
          return CHARS[Math.floor(Math.random() * CHARS.length)]
        }).join('')
      )
      if (step >= steps) {
        clearInterval(interval)
        setDisplay(text)
        setRunning(false)
      }
    }, duration / steps)
  }, [text, duration, running])

  useEffect(() => {
    if (trigger === 'mount') {
      const t = setTimeout(run, 100)
      return () => clearTimeout(t)
    }
  }, [])

  return (
    <span
      className={className}
      style={{ fontFamily: 'monospace', letterSpacing: '0.04em', ...style }}
      onMouseEnter={() => trigger === 'hover' && run()}
    >
      {display}
    </span>
  )
}

// ─── ColourfulText ──────────────────────────────────────────────
// Texto com gradiente animado multicolor.
// Uso: <ColourfulText>Financeiro</ColourfulText>
export function ColourfulText({
  children,
  className = '',
  colors = ['#7c6ef7', '#a78bfa', '#34d399', '#22d3ee', '#fbbf24', '#f87171', '#a06ef7'],
  speed = 4,
}: {
  children: React.ReactNode
  className?: string
  colors?: string[]
  speed?: number
}) {
  const gradient = `linear-gradient(90deg, ${[...colors, ...colors].join(', ')})`
  return (
    <span
      className={className}
      style={{
        background: gradient,
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: `colour-slide ${speed}s linear infinite`,
        display: 'inline-block',
      }}
    >
      {children}
    </span>
  )
}

// ─── BackgroundBeams ────────────────────────────────────────────
// Feixes de luz diagonais animados no fundo de uma seção.
// Uso: <BackgroundBeamsSection>conteúdo</BackgroundBeamsSection>
export function BackgroundBeamsSection({
  children,
  className = '',
  beamCount = 6,
}: {
  children: React.ReactNode
  className?: string
  beamCount?: number
}) {
  const beams = Array.from({ length: beamCount }, (_, i) => ({
    id: i,
    left: `${(i / beamCount) * 100 + Math.random() * 10}%`,
    angle: 30 + Math.random() * 20,
    duration: 6 + Math.random() * 8,
    delay: i * (12 / beamCount),
    width: 60 + Math.random() * 120,
    opacity: 0.04 + Math.random() * 0.08,
  }))

  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {beams.map(b => (
          <div
            key={b.id}
            style={{
              position: 'absolute',
              top: '-20%',
              left: b.left,
              width: b.width,
              height: '140%',
              background: `linear-gradient(180deg, transparent 0%, rgba(124,110,247,${b.opacity}) 40%, rgba(124,110,247,${b.opacity * 0.6}) 60%, transparent 100%)`,
              transform: `rotate(${b.angle}deg)`,
              transformOrigin: 'top center',
              animation: `beam-move ${b.duration}s ease-in-out ${b.delay}s infinite`,
              '--beam-angle': `${b.angle}deg`,
            } as React.CSSProperties}
          />
        ))}
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}

// ─── RippleBackground ───────────────────────────────────────────
// Ondas de ripple concêntricas irradiando do centro.
// Uso: <RippleBackground><Hero /></RippleBackground>
export function RippleBackground({
  children,
  className = '',
  color = 'rgba(124,110,247,0.12)',
  rings = 5,
}: {
  children: React.ReactNode
  className?: string
  color?: string
  rings?: number
}) {
  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden' }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 0,
      }}>
        {Array.from({ length: rings }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${(i + 1) * (100 / rings)}%`,
              paddingBottom: `${(i + 1) * (100 / rings)}%`,
              borderRadius: '50%',
              border: `1px solid ${color}`,
              animation: `ripple-expand ${3 + i * 0.8}s ease-out ${i * 0.5}s infinite`,
              opacity: 1 - i * 0.15,
            }}
          />
        ))}
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}

// ─── BentoGrid ──────────────────────────────────────────────────
// Grid bento-style responsivo. Cada BentoItem pode ser span 1 ou 2.
export function BentoGrid({
  children,
  className = '',
  cols = 3,
}: {
  children: React.ReactNode
  className?: string
  cols?: number
}) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 16,
        width: '100%',
      }}
    >
      {children}
    </div>
  )
}

export function BentoItem({
  children,
  className = '',
  span = 1,
  rowSpan = 1,
  style = {},
}: {
  children: React.ReactNode
  className?: string
  span?: 1 | 2 | 3
  rowSpan?: 1 | 2
  style?: React.CSSProperties
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={{
        gridColumn: `span ${span}`,
        gridRow: `span ${rowSpan}`,
        background: 'rgba(13,13,20,0.82)',
        border: '1px solid rgba(255,255,255,0.065)',
        backdropFilter: 'blur(14px)',
        boxShadow: '0 4px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      {/* Hover shimmer */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(105deg, transparent 0%, rgba(124,110,247,0.035) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'bento-shimmer 4s ease infinite',
          borderRadius: 'inherit',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>{children}</div>
    </motion.div>
  )
}

// ─── NoiseButton ────────────────────────────────────────────────
// Botão com textura noise animada. Alternativa ao ShimmerButton.
interface NoiseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'ghost'
}

export function NoiseButton({
  children,
  className = '',
  style = {},
  variant = 'primary',
  ...props
}: NoiseButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
      whileTap={{ scale: 0.97 }}
      {...(props as any)}
      className={`relative overflow-hidden ${className}`}
      style={{
        cursor: 'pointer',
        background: variant === 'primary'
          ? 'linear-gradient(135deg, #7c6ef7, #a06ef7)'
          : 'rgba(255,255,255,0.04)',
        border: variant === 'primary'
          ? '1px solid rgba(255,255,255,0.12)'
          : '1px solid rgba(255,255,255,0.08)',
        boxShadow: variant === 'primary'
          ? '0 0 28px rgba(124,110,247,0.4), inset 0 1px 0 rgba(255,255,255,0.15)'
          : 'none',
        color: 'white',
        ...style,
      }}
    >
      {/* Noise overlay */}
      <span aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
        backgroundSize: '120px 120px',
        animation: 'noise-shift 0.5s steps(1) infinite',
        mixBlendMode: 'overlay',
        borderRadius: 'inherit',
      }} />
      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
        {children}
      </span>
    </motion.button>
  )
}

// ─── FloatingDock ───────────────────────────────────────────────
// Dock flutuante estilo macOS para navegação mobile.
// items: { icon, label, href, active? }[]
interface DockItem {
  icon: React.ReactNode
  label: string
  href: string
  active?: boolean
  color?: string
}

export function FloatingDock({
  items,
  className = '',
}: {
  items: DockItem[]
  className?: string
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 6,
        padding: '10px 14px',
        borderRadius: 24,
        background: 'rgba(10,10,18,0.92)',
        border: '1px solid rgba(124,110,247,0.18)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,110,247,0.06)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {items.map((item, i) => {
        const isHover = hoverIdx === i
        const isNeighbor = hoverIdx !== null && Math.abs(hoverIdx - i) === 1
        const scale = isHover ? 1.45 : isNeighbor ? 1.2 : 1

        return (
          <a
            key={item.href}
            href={item.href}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{ position: 'relative', textDecoration: 'none' }}
          >
            <motion.div
              animate={{ scale, y: isHover ? -10 : isNeighbor ? -4 : 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: item.active
                  ? 'linear-gradient(135deg, rgba(124,110,247,0.3), rgba(160,110,247,0.2))'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${item.active ? 'rgba(124,110,247,0.35)' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: item.active ? '0 0 16px rgba(124,110,247,0.25)' : 'none',
                color: item.active ? (item.color || '#9d8fff') : '#4a4a6a',
                transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                cursor: 'pointer',
              }}
            >
              {item.icon}
            </motion.div>

            {/* Tooltip */}
            <AnimatePresence>
              {isHover && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.9 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    position: 'absolute',
                    bottom: '110%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap',
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: 'rgba(10,10,18,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#d0d0e0',
                    pointerEvents: 'none',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                  }}
                >
                  {item.label}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active dot */}
            {item.active && (
              <div style={{
                position: 'absolute',
                bottom: -6,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: item.color || '#7c6ef7',
                boxShadow: `0 0 6px ${item.color || '#7c6ef7'}`,
              }} />
            )}
          </a>
        )
      })}
    </div>
  )
}

// ─── BossLoader ─────────────────────────────────────────────────
// Full-page loader com logo BossFlow + rings animados.
// Uso: {loading && <BossLoader />}
export function BossLoader({
  message = 'Carregando...',
}: {
  message?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(7,7,14,0.96)',
        backdropFilter: 'blur(12px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 24,
      }}
    >
      {/* Logo mark */}
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        {/* Outer ring */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#7c6ef7',
          borderRightColor: 'rgba(124,110,247,0.3)',
          animation: 'loader-spin 1s linear infinite',
        }} />
        {/* Middle ring */}
        <div style={{
          position: 'absolute', inset: 8, borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#a06ef7',
          borderLeftColor: 'rgba(160,110,247,0.3)',
          animation: 'loader-spin 0.75s linear infinite reverse',
        }} />
        {/* Center logo */}
        <div style={{
          position: 'absolute', inset: 16, borderRadius: 8,
          background: 'linear-gradient(135deg, #7c6ef7, #a06ef7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(124,110,247,0.5)',
          animation: 'loader-pulse 2s ease-in-out infinite',
        }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 10, color: 'white', letterSpacing: '-0.02em' }}>BF</span>
        </div>
      </div>

      {message && (
        <p style={{
          fontSize: 13,
          color: '#4a4a6a',
          letterSpacing: '0.08em',
          fontWeight: 500,
        }}>
          {message}
        </p>
      )}
    </motion.div>
  )
}

// ─── CardSpotlight ──────────────────────────────────────────────
// Variante do SpotlightCard com glow colorido mais intenso no pointer.
// Diferencial: glow segue o mouse com cor customizável.
export function CardSpotlight({
  children,
  className = '',
  style = {},
  color = '#7c6ef7',
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  color?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: -999, y: -999 })
  const [hovered, setHovered] = useState(false)

  const onMove = useCallback((e: MouseEvent) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
  }, [])

  useEffect(() => {
    const el = ref.current; if (!el) return
    const enter = () => setHovered(true)
    const leave = () => { setHovered(false); setPos({ x: -999, y: -999 }) }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseenter', enter)
    el.addEventListener('mouseleave', leave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseenter', enter)
      el.removeEventListener('mouseleave', leave)
    }
  }, [onMove])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        position: 'relative', overflow: 'hidden',
        background: 'rgba(13,13,20,0.82)',
        border: `1px solid ${hovered ? `${color}30` : 'rgba(255,255,255,0.065)'}`,
        backdropFilter: 'blur(14px)',
        transition: 'border-color 0.25s ease',
        ...style,
      }}
    >
      {/* Strong spotlight */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, borderRadius: 'inherit',
        background: `radial-gradient(320px circle at ${pos.x}px ${pos.y}px, ${color}1a 0%, transparent 65%)`,
        transition: hovered ? 'none' : 'background 0.4s ease',
      }} />
      {/* Outer glow at pointer */}
      {hovered && (
        <div style={{
          position: 'absolute', pointerEvents: 'none', zIndex: 1, borderRadius: '50%',
          width: 120, height: 120,
          left: pos.x - 60, top: pos.y - 60,
          background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
          filter: 'blur(12px)',
          transition: 'none',
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
    </div>
  )
}

// ─── DottedGlowBackground ────────────────────────────────────────
// Background dots com glow radial centralizado. Alternativa ao BackgroundGrid.
// Uso: substitui BackgroundGrid em páginas específicas.
export function DottedGlowBackground({
  children,
  glowColor = 'rgba(124,110,247,0.15)',
  dotColor = 'rgba(124,110,247,0.12)',
}: {
  children: React.ReactNode
  glowColor?: string
  dotColor?: string
}) {
  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      {/* Dots */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
      }} />
      {/* Central glow */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '70vw', height: '70vh',
        background: `radial-gradient(ellipse at center, ${glowColor} 0%, transparent 70%)`,
        filter: 'blur(40px)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}

// ─── LampEffect ─────────────────────────────────────────────────
// Efeito de luz cônica vindo do topo — usar no hero do login
export function LampEffect({
  children,
  color = '#3b82f6',
}: {
  children: React.ReactNode
  color?: string
}) {
  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Cone de luz */}
      <div style={{
        position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
        width: '60%', height: 280, pointerEvents: 'none', zIndex: 0,
        background: `conic-gradient(from 270deg at 50% 0%, transparent 30%, ${color}20 50%, transparent 70%)`,
        filter: 'blur(2px)',
      }}/>
      {/* Linha horizontal brilhante */}
      <div style={{
        position: 'absolute', top: 0, left: '5%', right: '5%', height: 1,
        background: `linear-gradient(90deg, transparent, ${color}60, ${color}90, ${color}60, transparent)`,
        boxShadow: `0 0 20px 2px ${color}40`,
        pointerEvents: 'none', zIndex: 1,
      }}/>
      {/* Glow radial central */}
      <div style={{
        position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
        width: 300, height: 300, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}18 0%, transparent 65%)`,
        filter: 'blur(20px)',
        pointerEvents: 'none', zIndex: 0,
      }}/>
      <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>{children}</div>
    </div>
  )
}

// ─── GlareCard ──────────────────────────────────────────────────
// Card com reflexo de luz diagonal ao hover — estilo premium
export function GlareCard({
  children,
  className = '',
  style = {},
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 })
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const onMove = useCallback((e: MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 100
    const y = ((e.clientY - r.top) / r.height) * 100
    const tiltX = ((y - 50) / 50) * -8
    const tiltY = ((x - 50) / 50) * 8
    setGlare({ x, y, opacity: 0.12 })
    setTilt({ x: tiltX, y: tiltY })
  }, [])

  const onLeave = useCallback(() => {
    setGlare(g => ({ ...g, opacity: 0 }))
    setTilt({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [onMove, onLeave])

  return (
    <motion.div
      ref={ref}
      animate={{ rotateX: tilt.x, rotateY: tilt.y }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        transformStyle: 'preserve-3d',
        ...style,
      }}
      className={className}
    >
      {/* Glare overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}) 0%, transparent 60%)`,
        transition: glare.opacity === 0 ? 'opacity 0.4s' : 'none',
        borderRadius: 'inherit',
      }}/>
      {/* Shine sweep */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9,
        background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)`,
        borderRadius: 'inherit',
      }}/>
      {children}
    </motion.div>
  )
}
