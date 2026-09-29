import { createHash, randomUUID } from 'crypto'

export type AdPlatform = 'tiktok' | 'meta' | 'google' | 'kwai' | 'organic' | 'unknown'
export type CanonicalPaymentStatus =
  | 'initiate_checkout'
  | 'waiting_payment'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'chargeback'
  | 'cancelled'

export function detectPlatform(input: {
  ttclid?: string | null
  fbclid?: string | null
  gclid?: string | null
  kwclid?: string | null
  kwai_click_id?: string | null
  utm_source?: string | null
}): AdPlatform {
  if (input.ttclid) return 'tiktok'
  if (input.fbclid) return 'meta'
  if (input.gclid) return 'google'
  if (input.kwclid || input.kwai_click_id) return 'kwai'

  const source = (input.utm_source || '').toLowerCase()
  if (source.includes('tiktok') || source === 'tt') return 'tiktok'
  if (source.includes('facebook') || source.includes('meta') || source === 'fb' || source.includes('instagram')) return 'meta'
  if (source.includes('google')) return 'google'
  if (source.includes('kwai')) return 'kwai'
  return source ? 'unknown' : 'organic'
}

export function platformClick(input: {
  ttclid?: string | null
  fbclid?: string | null
  gclid?: string | null
  kwclid?: string | null
  kwai_click_id?: string | null
}) {
  if (input.ttclid) return { param: 'ttclid', value: input.ttclid }
  if (input.fbclid) return { param: 'fbclid', value: input.fbclid }
  if (input.gclid) return { param: 'gclid', value: input.gclid }
  if (input.kwclid) return { param: 'kwclid', value: input.kwclid }
  if (input.kwai_click_id) return { param: 'kwai_click_id', value: input.kwai_click_id }
  return { param: null, value: null }
}

export function normalizePaymentStatus(input: unknown): CanonicalPaymentStatus | null {
  const s = String(input || '').trim().toLowerCase().replace(/[ -]/g, '_')
  const map: Record<string, CanonicalPaymentStatus> = {
    initiate_checkout: 'initiate_checkout',
    checkout: 'initiate_checkout',
    checkout_started: 'initiate_checkout',
    started: 'initiate_checkout',
    waiting_payment: 'waiting_payment',
    pending: 'waiting_payment',
    pending_payment: 'waiting_payment',
    payment_created: 'waiting_payment',
    generated: 'waiting_payment',
    pix_generated: 'waiting_payment',
    paid: 'paid',
    approved: 'paid',
    payment_approved: 'paid',
    completed: 'paid',
    complete: 'paid',
    failed: 'failed',
    refused: 'failed',
    declined: 'failed',
    refunded: 'refunded',
    refund: 'refunded',
    chargeback: 'chargeback',
    cancelled: 'cancelled',
    canceled: 'cancelled',
  }
  return map[s] || null
}

export function eventNameForStatus(status: CanonicalPaymentStatus) {
  switch (status) {
    case 'initiate_checkout': return 'initiate_checkout'
    case 'waiting_payment': return 'payment_created'
    case 'paid': return 'purchase'
    case 'failed': return 'payment_failed'
    case 'refunded': return 'refund'
    case 'chargeback': return 'chargeback'
    case 'cancelled': return 'payment_cancelled'
  }
}

export function safeAmountCents(value: unknown, alreadyCents = false) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(alreadyCents ? value : value * 100))
  }
  if (typeof value !== 'string') return 0
  const raw = value.trim()
  if (!raw) return 0
  const cleaned = raw.replace(/[^\d,.-]/g, '')
  let normalized = cleaned
  if (cleaned.includes(',') && cleaned.includes('.')) normalized = cleaned.replace(/\./g, '').replace(',', '.')
  else if (cleaned.includes(',')) normalized = cleaned.replace(',', '.')
  const number = Number(normalized)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.round(alreadyCents ? number : number * 100))
}

export function eventId(prefix = 'evt') {
  return `${prefix}_${randomUUID().replace(/-/g, '')}`
}

export function dedupKey(parts: Array<string | number | null | undefined>) {
  const normalized = parts.map(v => String(v ?? '')).join('|')
  return createHash('sha256').update(normalized).digest('hex')
}
