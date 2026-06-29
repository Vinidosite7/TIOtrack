// Componentes de UI compartilhados — redesign BossFlow aesthetic
import { T } from '@/lib/tokens'
import { useState } from 'react'

// ── Grid background ───────────────────────────────────────────
export function GridBg() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.025 }}>
        <defs>
          <pattern id="grid-shared" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-shared)" />
      </svg>
      <div style={{
        position: 'absolute', top: '20%', left: '50%',
        width: 800, height: 500,
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.04) 0%, transparent 70%)',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />
    </div>
  )
}

// ── Page header (título Syne + subtitle) ──────────────────────
export function PageHeader({
  title, subtitle, action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div style={{
      padding: '24px 24px 0',
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between', flexShrink: 0,
    }}>
      <div>
        <h1 style={{
          fontSize: 22, fontWeight: 800,
          fontFamily: "'Syne', sans-serif",
          color: '#f0f0ff', letterSpacing: '-0.03em',
          lineHeight: 1.15, margin: 0,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: 12, color: T.text2,
            fontFamily: "'DM Sans', sans-serif",
            marginTop: 3,
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ── Topbar (barra fina de controles) ─────────────────────────
export function Topbar({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div style={{
      height: 48, borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', padding: '0 20px', gap: 8, flexShrink: 0,
      background: 'rgba(7,8,18,0.9)', backdropFilter: 'blur(16px)',
      position: 'relative', zIndex: 10,
    }}>
      <span style={{
        fontSize: 13, fontWeight: 700,
        fontFamily: "'Syne', sans-serif",
        color: T.text1, letterSpacing: '-0.02em',
      }}>
        {title}
      </span>
      <div style={{ flex: 1 }} />
      {children}
    </div>
  )
}

// ── Pill button ───────────────────────────────────────────────
export function Pill({ label, active, onClick, color }: {
  label: string; active: boolean; onClick: () => void; color?: string
}) {
  const [hov, setHov] = useState(false)
  const c = color ?? T.accent
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        height: 28, padding: '0 12px', borderRadius: 8,
        background: active ? `${c}18` : hov ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: `1px solid ${active ? `${c}40` : T.border}`,
        color: active ? c : T.text2,
        fontSize: 11, cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: active ? 600 : 400,
        transition: 'all 150ms ease',
      }}
    >
      {label}
    </button>
  )
}

// ── Icon button ───────────────────────────────────────────────
export function IconBtn({ onClick, children, title, danger }: {
  onClick: () => void; children: React.ReactNode; title?: string; danger?: boolean
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 30, height: 30, borderRadius: 8,
        background: danger
          ? hov ? 'rgba(248,113,113,0.12)' : 'rgba(248,113,113,0.05)'
          : hov ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${danger
          ? hov ? 'rgba(248,113,113,0.3)' : 'rgba(248,113,113,0.12)'
          : hov ? T.border : T.borderSub}`,
        color: danger ? T.red : T.text3,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 150ms',
      }}
    >
      {children}
    </button>
  )
}

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, glow, accentColor, style = {} }: {
  children: React.ReactNode; glow?: boolean; accentColor?: string; style?: React.CSSProperties
}) {
  const [hov, setHov] = useState(false)
  const c = accentColor ?? T.accent
  return (
    <div
      onMouseEnter={() => glow && setHov(true)}
      onMouseLeave={() => glow && setHov(false)}
      style={{
        background: T.bgCard,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${hov ? `${c}30` : T.border}`,
        borderRadius: 16, overflow: 'hidden',
        position: 'relative',
        boxShadow: hov ? `0 0 0 1px ${c}15, 0 8px 32px rgba(0,0,0,0.4)` : 'none',
        transition: 'border-color 200ms, box-shadow 200ms',
        ...style,
      }}
    >
      {hov && accentColor && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${c}, ${c}30)`,
          pointerEvents: 'none',
        }} />
      )}
      {children}
    </div>
  )
}

// ── Card header ───────────────────────────────────────────────
export function CardHeader({ title, badge, action }: {
  title: string; badge?: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div style={{
      padding: '10px 16px', borderBottom: `1px solid ${T.borderSub}`,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{
        fontSize: 10, color: T.text3, fontWeight: 700,
        fontFamily: "'DM Sans', sans-serif",
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        {title}
      </span>
      {badge && <div style={{ marginLeft: 4 }}>{badge}</div>}
      <div style={{ flex: 1 }} />
      {action}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────
export function Badge({ label, color = T.accent }: { label: string; color?: string }) {
  return (
    <span style={{
      fontSize: 9, padding: '2px 8px', borderRadius: 20,
      background: `${color}18`, color,
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: '0.03em', fontWeight: 600,
      border: `1px solid ${color}25`,
    }}>
      {label}
    </span>
  )
}

// ── Empty state ───────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, sub }: {
  icon: React.ElementType; title: string; sub?: string
}) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14, margin: '0 auto 16px',
        background: T.bgRaised, border: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={22} style={{ color: T.text3 }} />
      </div>
      <p style={{
        fontSize: 14, color: T.text2, marginBottom: 6,
        fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
      }}>
        {title}
      </p>
      {sub && (
        <p style={{
          fontSize: 12, color: T.text3, lineHeight: 1.7,
          fontFamily: "'DM Sans', sans-serif", maxWidth: 320, margin: '0 auto',
        }}>
          {sub}
        </p>
      )}
    </div>
  )
}

// ── Skeleton row (table) ──────────────────────────────────────
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '10px 12px' }}>
          <div style={{
            height: 11, borderRadius: 4,
            background: `linear-gradient(90deg, ${T.bgRaised} 0%, rgba(255,255,255,0.04) 50%, ${T.bgRaised} 100%)`,
            backgroundSize: '200% 100%',
            animation: 'skeleton-slide 1.4s ease-in-out infinite',
            width: i === 0 ? '80%' : i === 1 ? '60%' : '40%',
          }} />
        </td>
      ))}
    </tr>
  )
}

// ── Shared CSS ────────────────────────────────────────────────
export const sharedStyles = `
  @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
  @keyframes skeleton-slide {
    0%   { background-position: 200% 0 }
    100% { background-position: -200% 0 }
  }
  tbody tr { transition: background 100ms ease; }
  tbody tr:hover { background: rgba(255,255,255,0.02) !important; }
`
