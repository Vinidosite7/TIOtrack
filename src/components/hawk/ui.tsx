'use client'

// Hawk UI kit — blocos visuais do Command Center (KPI, pulso, gauge, mapa, painéis)

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { geoMercator, geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import countries from 'i18n-iso-countries'
import world from 'world-atlas/countries-110m.json'

export const H = {
  bg: '#0b0d18',
  panel: '#161a2c',
  line: 'rgba(170,176,235,.09)',
  lineSoft: 'rgba(170,176,235,.055)',
  text: '#eceefb',
  sub: '#9ea3c2',
  muted: '#666c8e',
  lav: '#a3a7f2',
  lavStrong: '#858be6',
  lavLight: '#dcdefd',
  lavDim: '#4b5082',
  green: '#74d3ab',
  red: '#f0899b',
  amber: '#e8c27f',
  mono: "'JetBrains Mono', ui-monospace, monospace",
} as const

// ── formatters ────────────────────────────────────────────────
export const brl = (n: number, digits = 0) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: digits, minimumFractionDigits: digits })
export const num = (n: number) => Math.round(n).toLocaleString('pt-BR')
export const short = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace('.', ',')}k` : Math.round(n).toString()
export const pctDelta = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0
export const flag = (cc?: string | null) => {
  if (!cc || cc.length !== 2) return '🌐'
  return String.fromCodePoint(...cc.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)))
}
export const countryName = (cc?: string | null) => {
  if (!cc) return 'Desconhecido'
  try { return new Intl.DisplayNames(['pt-BR'], { type: 'region' }).of(cc.toUpperCase()) || cc } catch { return cc }
}
export const timeHMS = (s: string) => new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

// ── Panel ─────────────────────────────────────────────────────
export function Panel({ children, style, className = '' }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return <section className={`tt-card ${className}`} style={{ position: 'relative', overflow: 'hidden', ...style }}>{children}</section>
}

export function PanelHead({ title, sub, right, dot }: { title: string; sub?: React.ReactNode; right?: React.ReactNode; dot?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '16px 18px 0' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <h2 className="tt-h">{title}</h2>
          {dot && <span className="tt-status-dot hk-live-dot" style={{ background: H.lav, boxShadow: `0 0 10px ${H.lav}` }} />}
        </div>
        {sub && <div className="tt-cap" style={{ marginTop: 3 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

export function IconOrb({ icon: Icon, size = 38 }: { icon: any; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 999, flexShrink: 0, display: 'grid', placeItems: 'center',
      background: 'radial-gradient(circle at 35% 30%, rgba(220,222,253,.35) 0%, rgba(133,139,230,.55) 55%, rgba(75,80,130,.6) 100%)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25), 0 6px 18px rgba(133,139,230,.25)',
      border: '1px solid rgba(220,222,253,.22)',
    }}>
      <Icon size={size * 0.42} color="#f4f5ff" strokeWidth={2} />
    </div>
  )
}

// ── KPI card (Faturamento, Gastos, ROAS, CPA…) ────────────────
export function KpiCard({ icon, label, value, delta, invert, progress, href, hint, foot, loading }: {
  icon: any; label: string; value: string; delta?: number | null; invert?: boolean; progress?: number; href?: string; hint?: string; foot?: string; loading?: boolean
}) {
  const good = delta == null ? null : invert ? delta <= 0 : delta >= 0
  const deltaTxt = delta == null ? '—' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')}%`
  const p = Math.max(0, Math.min(1, progress ?? 0.6))
  const body = (
    <Panel style={{ padding: '14px 14px 12px', height: '100%', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 118 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <IconOrb icon={icon} size={34} />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: H.sub, fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
          <div className="tt-num" style={{ fontSize: 'clamp(18px, 1.45vw, 23px)', lineHeight: 1.15, marginTop: 2, whiteSpace: 'nowrap' }}>{loading ? '—' : value}</div>
        </div>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(163,167,242,.10)', overflow: 'hidden' }}>
          <div style={{ width: `${p * 100}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, rgba(163,167,242,.35), #dcdefd)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          {foot != null
            ? <span title={hint} style={{ fontSize: 11, color: H.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{foot}</span>
            : <span title={hint || 'vs. período anterior'} style={{ fontSize: 11, fontWeight: 600, color: good == null ? H.muted : good ? H.green : H.red }}>{deltaTxt}</span>}
          {href && <ArrowUpRight size={13} color={H.muted} />}
        </div>
      </div>
    </Panel>
  )
  return href ? <Link href={href} style={{ display: 'block', height: '100%' }}>{body}</Link> : body
}

// ── Tráfego ao vivo (card largo com pulso de 30 min) ──────────
export function TrafficPulseCard({ active, bars, href = '/traffic', loading }: { active: number; bars: number[]; href?: string; loading?: boolean }) {
  const max = Math.max(...bars, 1)
  return (
    <Panel style={{ padding: '14px 18px', height: '100%', minHeight: 118 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ color: H.text, fontSize: 14, fontWeight: 700 }}>Tráfego</span>
          <span className="tt-status-dot hk-live-dot" style={{ background: H.lav, boxShadow: `0 0 10px ${H.lav}` }} />
        </div>
        <Link href={href} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: H.sub, fontSize: 11, fontWeight: 500 }}>Ver detalhes <ArrowUpRight size={12} /></Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 18, marginTop: 8 }}>
        <div style={{ flexShrink: 0, paddingRight: 18, borderRight: `1px solid ${H.line}` }}>
          <div className="tt-num" style={{ fontSize: 'clamp(38px, 3.4vw, 52px)', lineHeight: 1, background: 'linear-gradient(180deg, #ffffff 0%, #b9bcf7 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            {loading ? '—' : num(active)}
          </div>
          <div style={{ color: H.muted, fontSize: 11, marginTop: 4 }}>ativos agora</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: H.muted, fontSize: 10.5, marginBottom: 6 }}>Últimos 30 min</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 3, minHeight: 44 }} aria-label="Requisições por minuto nos últimos 30 minutos">
            {bars.map((v, i) => (
              <div key={i} title={`${v} req · há ${bars.length - 1 - i} min`} style={{
                flex: 1, minWidth: 2, borderRadius: 2,
                height: `${Math.max(8, (v / max) * 100)}%`,
                background: v ? 'linear-gradient(180deg, #eef0ff 0%, #8c91ea 100%)' : 'rgba(163,167,242,.14)',
                opacity: v ? 0.55 + 0.45 * (i / bars.length) : 1,
              }} />
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}

// ── Gauge circular (requisições) ──────────────────────────────
export function Gauge({ value, ratio, label }: { value: number; ratio: number; label: string }) {
  const r = 54, c = 2 * Math.PI * r
  const arc = 0.78 // arco aberto embaixo
  const fill = Math.max(0, Math.min(1, ratio))
  return (
    <div style={{ position: 'relative', width: 150, height: 150, flexShrink: 0 }}>
      <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: 'rotate(130deg)' }}>
        <defs>
          <linearGradient id="hk-gauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#dcdefd" />
            <stop offset="100%" stopColor="#7d82d9" />
          </linearGradient>
        </defs>
        <circle cx="75" cy="75" r={r} fill="none" stroke="rgba(163,167,242,.12)" strokeWidth="11" strokeLinecap="round" strokeDasharray={`${c * arc} ${c}`} />
        <circle cx="75" cy="75" r={r} fill="none" stroke="url(#hk-gauge)" strokeWidth="11" strokeLinecap="round" strokeDasharray={`${c * arc * fill} ${c}`} style={{ transition: 'stroke-dasharray .6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div className="tt-num" style={{ fontSize: 26, lineHeight: 1 }}>{num(value)}</div>
          <div style={{ color: H.muted, fontSize: 10.5, marginTop: 4 }}>{label}</div>
        </div>
      </div>
    </div>
  )
}

export function MeterRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div style={{ padding: '9px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: H.sub, fontSize: 12 }}>
          <span className="tt-status-dot" style={{ width: 5, height: 5, background: H.lav }} />{label}
        </span>
        <span className="tt-num" style={{ fontSize: 13 }}>{num(value)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'rgba(163,167,242,.10)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, rgba(163,167,242,.4), #dcdefd)', transition: 'width .5s ease' }} />
        </div>
        <span style={{ color: H.muted, fontSize: 10.5, minWidth: 34, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
      </div>
    </div>
  )
}

// ── Mapa de tráfego por país ──────────────────────────────────
type Geo = { type: 'Feature'; id?: string | number; properties: { name: string }; geometry: any }
const WORLD: Geo[] = (feature(world as any, (world as any).objects.countries) as any).features.filter((f: Geo) => f.properties.name !== 'Antarctica')

export function WorldMap({ counts, height = 220 }: { counts: Record<string, number>; height?: number }) {
  const W = 420
  const { paths, max } = useMemo(() => {
    const byNumeric: Record<string, number> = {}
    for (const [cc, v] of Object.entries(counts)) {
      const n = countries.alpha2ToNumeric(cc.toUpperCase())
      if (n) byNumeric[String(n).padStart(3, '0')] = (byNumeric[String(n).padStart(3, '0')] || 0) + v
    }
    const hit = WORLD.filter(f => byNumeric[String(f.id)])
    // Zoom no que importa: se o tráfego está concentrado, enquadra só esses países (tipo o Hawk no US)
    const focus = hit.length > 0 && hit.length <= 6 ? { type: 'FeatureCollection', features: hit } : { type: 'FeatureCollection', features: WORLD }
    const projection = (hit.length > 0 && hit.length <= 6 ? geoMercator() : geoNaturalEarth1())
      .fitExtent([[12, 12], [W - 12, height - 12]], focus as any)
    const path = geoPath(projection)
    const m = Math.max(1, ...Object.values(byNumeric))
    return {
      max: m,
      paths: WORLD.map(f => ({ id: String(f.id), name: f.properties.name, d: path(f as any) || '', v: byNumeric[String(f.id)] || 0 })),
    }
  }, [counts, height])

  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} role="img" aria-label="Mapa de tráfego por país" style={{ display: 'block', overflow: 'hidden' }}>
      <defs>
        <linearGradient id="hk-land-hot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9cbfb" />
          <stop offset="100%" stopColor="#8288e2" />
        </linearGradient>
      </defs>
      {paths.map(p => {
        const t = p.v / max
        return (
          <path key={p.id + p.name} d={p.d}
            fill={p.v ? (t > 0.66 ? 'url(#hk-land-hot)' : `rgba(163,167,242,${0.35 + t * 0.6})`) : 'rgba(10,12,24,.85)'}
            stroke={p.v ? 'rgba(220,222,253,.55)' : 'rgba(163,167,242,.16)'} strokeWidth={0.5}>
            <title>{`${p.name}: ${p.v}`}</title>
          </path>
        )
      })}
    </svg>
  )
}

// ── Pagination "1 2 3 >" ──────────────────────────────────────
export function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null
  const btn = (active: boolean): React.CSSProperties => ({
    width: 22, height: 22, borderRadius: 6, fontSize: 11, fontWeight: 600, display: 'grid', placeItems: 'center',
    color: active ? '#11142a' : H.sub, background: active ? H.lav : 'transparent',
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button style={btn(false)} disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="Anterior">‹</button>
      {Array.from({ length: Math.min(5, pages) }, (_, j) => Math.max(0, Math.min(pages - 5, page - 2)) + j).map(i => <button key={i} style={btn(i === page)} onClick={() => onChange(i)}>{i + 1}</button>)}
      <button style={btn(false)} disabled={page >= pages - 1} onClick={() => onChange(page + 1)} aria-label="Próxima">›</button>
    </div>
  )
}

export function Empty({ children, pad = 36 }: { children: React.ReactNode; pad?: number }) {
  return <div style={{ padding: pad, textAlign: 'center', color: H.muted, fontSize: 12.5 }}>{children}</div>
}

// ── Cabeçalho de página ───────────────────────────────────────
export function PageHeader({ title, sub, right, eyebrow }: { title: string; sub?: React.ReactNode; right?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div className="tt-eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>}
        <h1 className="tt-title">{title}</h1>
        {sub && <div className="tt-cap" style={{ marginTop: 4 }}>{sub}</div>}
      </div>
      {right && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{right}</div>}
    </div>
  )
}

export type Period = 'hoje' | '7d' | '30d'
export const PERIOD_LABEL: Record<Period, string> = { hoje: 'Hoje', '7d': '7 dias', '30d': '30 dias' }
export function PeriodSegment({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="tt-segment">
      {(['hoje', '7d', '30d'] as Period[]).map(p => <button key={p} data-active={value === p} onClick={() => onChange(p)}>{PERIOD_LABEL[p]}</button>)}
    </div>
  )
}

export function RefreshBtn({ spinning, onClick }: { spinning?: boolean; onClick: () => void }) {
  return (
    <button className="tt-icon-btn" title="Atualizar" aria-label="Atualizar" onClick={onClick}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: spinning ? 'spin 1s linear infinite' : undefined }}>
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" />
      </svg>
    </button>
  )
}

// ── Lista com barra (ranking) ─────────────────────────────────
export function BarRow({ label, sub, value, right, ratio, onClick, active }: { label: React.ReactNode; sub?: React.ReactNode; value: React.ReactNode; right?: React.ReactNode; ratio: number; onClick?: () => void; active?: boolean }) {
  return (
    <div onClick={onClick} style={{ padding: '10px 0', borderBottom: `1px solid ${H.lineSoft}`, cursor: onClick ? 'pointer' : undefined, background: active ? 'rgba(163,167,242,.05)' : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: H.text, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
          {sub && <div style={{ color: H.muted, fontSize: 10.5, marginTop: 2 }}>{sub}</div>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="tt-num" style={{ fontSize: 13.5 }}>{value}</div>
          {right && <div style={{ color: H.muted, fontSize: 10.5, marginTop: 2 }}>{right}</div>}
        </div>
      </div>
      <div style={{ height: 3, borderRadius: 99, background: 'rgba(163,167,242,.10)', marginTop: 7, overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, rgba(163,167,242,.4), #dcdefd)', transition: 'width .5s ease' }} />
      </div>
    </div>
  )
}

// ── Status pill ───────────────────────────────────────────────
export const TONE = { good: H.green, warn: H.amber, bad: H.red, neutral: H.sub, lav: H.lav } as const
export function StatusPill({ tone = 'neutral', children }: { tone?: keyof typeof TONE; children: React.ReactNode }) {
  const c = TONE[tone]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: c, whiteSpace: 'nowrap' }}>
      <span className="tt-status-dot" style={{ width: 6, height: 6, background: c }} />{children}
    </span>
  )
}

// ── Mini stat (inset) ─────────────────────────────────────────
export function MiniStat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: keyof typeof TONE }) {
  return (
    <div className="tt-inset" style={{ padding: '12px 14px' }}>
      <div style={{ color: H.muted, fontSize: 11 }}>{label}</div>
      <div className="tt-num" style={{ fontSize: 20, marginTop: 6, color: tone ? TONE[tone] : H.text }}>{value}</div>
    </div>
  )
}

// ── Toggle ───────────────────────────────────────────────────
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} style={{
      width: 34, height: 20, borderRadius: 99, padding: 2, flexShrink: 0,
      background: on ? 'linear-gradient(180deg,#b3b6f7,#8c91ea)' : 'rgba(163,167,242,.12)', border: `1px solid ${on ? 'rgba(220,222,253,.4)' : H.line}`, transition: '.16s ease',
    }}>
      <span style={{ display: 'block', width: 14, height: 14, borderRadius: 99, background: on ? '#11142a' : H.muted, transform: `translateX(${on ? 14 : 0}px)`, transition: '.16s ease' }} />
    </button>
  )
}
