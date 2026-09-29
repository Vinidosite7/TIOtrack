export const FUNNEL_TYPES = [
  'site',
  'site_telegram',
  'telegram',
  'site_whatsapp',
  'whatsapp',
  'ecommerce',
  'custom',
] as const

export type FunnelType = typeof FUNNEL_TYPES[number]

export function isFunnelType(value: unknown): value is FunnelType {
  return typeof value === 'string' && (FUNNEL_TYPES as readonly string[]).includes(value)
}

export function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'produto'
}

export type FunnelStepSeed = {
  step_key: string
  name: string
  step_order: number
  channel: 'web' | 'telegram' | 'whatsapp' | 'checkout' | 'payment' | 'custom'
}

export function defaultSteps(type: FunnelType): FunnelStepSeed[] {
  const map: Record<FunnelType, FunnelStepSeed[]> = {
    site: [
      { step_key: 'landing', name: 'Página', step_order: 10, channel: 'web' },
      { step_key: 'checkout', name: 'Checkout', step_order: 20, channel: 'checkout' },
      { step_key: 'purchase', name: 'Compra', step_order: 30, channel: 'payment' },
    ],
    site_telegram: [
      { step_key: 'landing', name: 'Presell', step_order: 10, channel: 'web' },
      { step_key: 'telegram_start', name: 'Telegram Start', step_order: 20, channel: 'telegram' },
      { step_key: 'payment_created', name: 'PIX criado', step_order: 30, channel: 'payment' },
      { step_key: 'purchase', name: 'Compra', step_order: 40, channel: 'payment' },
    ],
    telegram: [
      { step_key: 'telegram_start', name: 'Telegram Start', step_order: 10, channel: 'telegram' },
      { step_key: 'payment_created', name: 'PIX criado', step_order: 20, channel: 'payment' },
      { step_key: 'purchase', name: 'Compra', step_order: 30, channel: 'payment' },
    ],
    site_whatsapp: [
      { step_key: 'landing', name: 'Página', step_order: 10, channel: 'web' },
      { step_key: 'whatsapp_start', name: 'WhatsApp', step_order: 20, channel: 'whatsapp' },
      { step_key: 'purchase', name: 'Compra', step_order: 30, channel: 'payment' },
    ],
    whatsapp: [
      { step_key: 'whatsapp_start', name: 'WhatsApp', step_order: 10, channel: 'whatsapp' },
      { step_key: 'purchase', name: 'Compra', step_order: 20, channel: 'payment' },
    ],
    ecommerce: [
      { step_key: 'store_view', name: 'Loja', step_order: 10, channel: 'web' },
      { step_key: 'checkout', name: 'Checkout', step_order: 20, channel: 'checkout' },
      { step_key: 'purchase', name: 'Compra', step_order: 30, channel: 'payment' },
    ],
    custom: [
      { step_key: 'entry', name: 'Entrada', step_order: 10, channel: 'custom' },
      { step_key: 'purchase', name: 'Compra', step_order: 100, channel: 'payment' },
    ],
  }
  return map[type]
}
