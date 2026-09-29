export type TrafficAction = 'allow' | 'challenge' | 'block' | 'redirect'
export type DeviceType = 'mobile' | 'desktop' | 'tablet' | 'unknown'

export type TrafficRule = {
  enabled?: boolean
  allowed_countries?: string[] | null
  allowed_devices?: string[] | null
  allowed_os?: string[] | null
  blocked_user_agents?: string[] | null
  challenge_risk_threshold?: number | null
  block_risk_threshold?: number | null
  default_action?: TrafficAction | null
  deny_action?: TrafficAction | null
  redirect_url?: string | null
}

export type TrafficRequestContext = {
  country?: string | null
  deviceType?: DeviceType | string | null
  os?: string | null
  userAgent?: string | null
  requestRate?: number
  hasJavascript?: boolean | null
  hasSession?: boolean
  datacenterHint?: boolean
}

export type TrafficDecision = {
  action: TrafficAction
  reason: string
  riskScore: number
  matchedSignals: string[]
}

const AUTOMATION_UA = [
  'curl', 'wget', 'python-requests', 'go-http-client', 'httpclient', 'headlesschrome',
  'phantomjs', 'selenium', 'playwright', 'puppeteer', 'scrapy',
]

export function detectDevice(userAgent = ''): DeviceType {
  const ua = userAgent.toLowerCase()
  if (!ua) return 'unknown'
  if (/ipad|tablet|kindle|silk/.test(ua)) return 'tablet'
  if (/mobi|iphone|ipod|android/.test(ua)) return 'mobile'
  return 'desktop'
}

export function detectOS(userAgent = ''): string {
  const ua = userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'
  if (/windows/.test(ua)) return 'windows'
  if (/mac os|macintosh/.test(ua)) return 'macos'
  if (/linux/.test(ua)) return 'linux'
  return 'unknown'
}

export function detectBrowser(userAgent = ''): string {
  const ua = userAgent.toLowerCase()
  if (/edg\//.test(ua)) return 'edge'
  if (/opr\//.test(ua)) return 'opera'
  if (/chrome|crios/.test(ua)) return 'chrome'
  if (/safari/.test(ua) && !/chrome|crios/.test(ua)) return 'safari'
  if (/firefox|fxios/.test(ua)) return 'firefox'
  return 'unknown'
}

export function calculateRisk(ctx: TrafficRequestContext, rule?: TrafficRule): { score: number; signals: string[] } {
  const ua = (ctx.userAgent ?? '').toLowerCase()
  const signals: string[] = []
  let score = 0
  const blockedPatterns = [...AUTOMATION_UA, ...(rule?.blocked_user_agents ?? [])]
    .map(v => v.toLowerCase()).filter(Boolean)

  if (!ua) { score += 25; signals.push('user-agent ausente') }
  if (blockedPatterns.some(p => ua.includes(p))) { score += 55; signals.push('user-agent de automação') }
  if (ctx.datacenterHint) { score += 20; signals.push('origem de datacenter') }
  if ((ctx.requestRate ?? 0) > 120) { score += 45; signals.push('taxa de requisições anormal') }
  else if ((ctx.requestRate ?? 0) > 60) { score += 25; signals.push('taxa de requisições elevada') }
  if (ctx.hasJavascript === false) { score += 15; signals.push('sem confirmação de JavaScript') }
  if (ctx.hasSession) score -= 10
  return { score: Math.max(0, Math.min(100, score)), signals }
}

export function evaluateTraffic(rule: TrafficRule | null | undefined, ctx: TrafficRequestContext): TrafficDecision {
  if (!rule?.enabled) return { action: 'allow', reason: 'Sem regra ativa', riskScore: 0, matchedSignals: [] }

  const country = (ctx.country ?? '').toUpperCase()
  const device = (ctx.deviceType ?? 'unknown').toLowerCase()
  const os = (ctx.os ?? 'unknown').toLowerCase()
  const allowedCountries = (rule.allowed_countries ?? []).map(v => v.toUpperCase())
  const allowedDevices = (rule.allowed_devices ?? []).map(v => v.toLowerCase())
  const allowedOS = (rule.allowed_os ?? []).map(v => v.toLowerCase())

  if (allowedCountries.length && country && !allowedCountries.includes(country)) {
    return { action: rule.deny_action ?? 'block', reason: `País ${country} não permitido`, riskScore: 0, matchedSignals: ['country'] }
  }
  if (allowedDevices.length && !allowedDevices.includes(device)) {
    return { action: rule.deny_action ?? 'block', reason: `Dispositivo ${device} não permitido`, riskScore: 0, matchedSignals: ['device'] }
  }
  if (allowedOS.length && os !== 'unknown' && !allowedOS.includes(os)) {
    return { action: rule.deny_action ?? 'block', reason: `Sistema ${os} não permitido`, riskScore: 0, matchedSignals: ['os'] }
  }

  const risk = calculateRisk(ctx, rule)
  const blockAt = rule.block_risk_threshold ?? 75
  const challengeAt = rule.challenge_risk_threshold ?? 40
  if (risk.score >= blockAt) return { action: 'block', reason: risk.signals.join(' + ') || 'Risco alto', riskScore: risk.score, matchedSignals: risk.signals }
  if (risk.score >= challengeAt) return { action: 'challenge', reason: risk.signals.join(' + ') || 'Risco moderado', riskScore: risk.score, matchedSignals: risk.signals }
  return { action: rule.default_action ?? 'allow', reason: 'Regras atendidas', riskScore: risk.score, matchedSignals: risk.signals }
}
