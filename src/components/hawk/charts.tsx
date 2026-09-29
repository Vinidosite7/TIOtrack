'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { H, short, brl, Empty } from './ui'

export type SeriesDef = { key: string; label: string; tone: 'light' | 'dim' | 'mid' }

const FILL: Record<SeriesDef['tone'], string> = { light: 'url(#hk-g-light)', mid: 'url(#hk-g-mid)', dim: 'url(#hk-g-dim)' }
export const SWATCH: Record<SeriesDef['tone'], string> = { light: '#dcdefd', mid: '#8c91ea', dim: '#4b5082' }

/** Barras no padrão Hawk: finas, topo arredondado, gradiente branco→lavanda. */
export function HawkBars({ data, series, height = 280, money = true, hidden = {}, empty = 'Sem dados nesse período.' }: {
  data: any[]; series: SeriesDef[]; height?: number; money?: boolean; hidden?: Record<string, boolean>; empty?: string
}) {
  const visible = series.filter(s => !hidden[s.key])
  // barra fina demais + raio grande = Recharts não desenha; reduz o raio em gráficos densos
  const dense = data.length * Math.max(1, visible.length)
  const radius: [number, number, number, number] = dense > 80 ? [1, 1, 0, 0] : dense > 45 ? [2, 2, 0, 0] : [4, 4, 1, 1]
  const allZero = data.every(d => visible.every(s => !Number(d[s.key])))
  if (!data.length || allZero) return <div style={{ height }}><Empty pad={height / 2 - 20}>{empty}</Empty></div>
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={3} barCategoryGap={data.length <= 8 ? '34%' : '22%'}>
          <defs>
            <linearGradient id="hk-g-light" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f2f3ff" /><stop offset="100%" stopColor="#7e84dc" /></linearGradient>
            <linearGradient id="hk-g-mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a9adf5" /><stop offset="100%" stopColor="#5f65bf" /></linearGradient>
            <linearGradient id="hk-g-dim" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6b70a8" /><stop offset="100%" stopColor="#3b3f68" /></linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(163,167,242,.07)" vertical={false} strokeDasharray="3 4" />
          <XAxis dataKey="label" tick={{ fill: H.muted, fontSize: 10.5, fontStyle: 'italic' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={14} />
          <YAxis tick={{ fill: H.muted, fontSize: 10.5 }} axisLine={false} tickLine={false} tickFormatter={v => short(Number(v))} width={44} />
          <Tooltip cursor={{ fill: 'rgba(163,167,242,.06)' }} contentStyle={{ background: '#161a2c', border: `1px solid ${H.line}`, borderRadius: 10, color: H.text, fontSize: 12 }} labelStyle={{ color: H.sub }}
            formatter={(v: any, name: any) => [money ? brl(Number(v)) : Number(v).toLocaleString('pt-BR'), series.find(s => s.key === name)?.label || name]} />
          {visible.map(s => <Bar key={s.key} dataKey={s.key} fill={FILL[s.tone]} radius={radius} maxBarSize={14} minPointSize={0} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SeriesLegend({ series, hidden, onToggle }: { series: SeriesDef[]; hidden: Record<string, boolean>; onToggle: (k: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {series.map(s => (
        <button key={s.key} onClick={() => onToggle(s.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: H.sub, opacity: hidden[s.key] ? 0.4 : 1 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: SWATCH[s.tone] }} />{s.label}
        </button>
      ))}
    </div>
  )
}

/** Preenche dias vazios para o gráfico ficar contínuo. */
export function dayBuckets(from: string, days: number) {
  const out: { dia: string; label: string }[] = []
  const base = new Date(from + 'T12:00:00')
  for (let i = 0; i < days; i++) {
    const d = new Date(base); d.setDate(d.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    out.push({ dia: iso, label: iso.slice(8, 10) + '/' + iso.slice(5, 7) })
  }
  return out
}
