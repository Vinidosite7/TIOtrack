// ─── TioTrack Design Tokens — alinhado ao BossFlow visual ──────
export const T = {
  // Backgrounds
  bgBase:    '#070812',
  bgSurface: '#0a0b16',
  bgRaised:  '#0e1020',
  bgHover:   'rgba(255,255,255,0.035)',
  bgCard:    'rgba(10,10,18,0.92)',

  // Borders
  border:     'rgba(255,255,255,0.055)',
  borderSub:  'rgba(255,255,255,0.03)',
  border2:    'rgba(255,255,255,0.09)',
  borderGlow: 'rgba(59,130,246,0.22)',

  // Text
  text1: '#dcdcf0',
  text2: '#8a8aaa',
  text3: '#4a4a6a',

  // Accent — azul (identidade TioTrack)
  accent:       '#3b82f6',
  accentLight:  '#60a5fa',
  accentGlow:   'rgba(59,130,246,0.18)',
  accentGlow2:  'rgba(59,130,246,0.06)',
  accentDim:    'rgba(59,130,246,0.10)',

  // Semânticas
  green:      '#34d399',
  greenGlow:  'rgba(52,211,153,0.15)',
  red:        '#f87171',
  redGlow:    'rgba(248,113,113,0.12)',
  yellow:     '#fbbf24',
  yellowGlow: 'rgba(251,191,36,0.12)',
  purple:     '#a78bfa',
  purpleGlow: 'rgba(167,139,250,0.15)',
  cyan:       '#22d3ee',

  // Gradients
  gradAccent:  'linear-gradient(135deg, #3b82f6 0%, #a78bfa 100%)',
  gradGreen:   'linear-gradient(135deg, #34d399 0%, #3b82f6 100%)',
  gradSurface: 'linear-gradient(180deg, #0e1020 0%, #0a0b16 100%)',

  // Shadows
  shadowSm: '0 4px 16px rgba(0,0,0,0.35)',
  shadowMd: '0 12px 40px rgba(0,0,0,0.5)',
  shadowLg: '0 24px 70px rgba(0,0,0,0.65)',

  // Fonts — Syne para headings, DM Sans para body, JetBrains para dados
  display: "'Syne', sans-serif",
  sans:    "'DM Sans', sans-serif",
  mono:    "'JetBrains Mono', monospace",

  // Radius
  radius: '16px',
  radiusSm: '10px',
} as const
