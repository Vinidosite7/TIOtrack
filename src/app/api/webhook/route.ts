import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function validateSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  const clean = signature.startsWith('sha256=') ? signature.slice(7) : signature
  return clean === expected
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const { searchParams } = new URL(req.url)
    const workspace_id = searchParams.get('wid')

    if (!workspace_id) {
      return NextResponse.json({ error: 'wid obrigatório' }, { status: 400 })
    }

    // Valida assinatura HMAC
    const secret = process.env.SHARKBOT_WEBHOOK_SECRET
    if (secret) {
      const signature =
        req.headers.get('x-webhook-signature') ??
        req.headers.get('x-signature') ??
        req.headers.get('x-sharkbot-signature')
      if (signature && !validateSignature(rawBody, signature, secret)) {
        return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
      }
    }

    const body = JSON.parse(rawBody)

    // ── user_joined → salva lead ──────────────────────────────
    if (body.event === 'user_joined') {
      const d   = body.data ?? body
      const cus = d.customer ?? {}
      const trk = d.tracking ?? {}
      const bot = d.bot ?? {}
      const flw = d.flow ?? {}

      await supabaseAdmin.from('leads').insert({
        workspace_id,
        telegram_id:  cus.telegram_id ?? null,
        first_name:   cus.first_name ?? null,
        last_name:    cus.last_name ?? null,
        username:     cus.username ?? null,
        bot_username: bot.username ?? null,
        flow_name:    flw.name ?? null,
        utm_source:   trk.utm_source ?? null,
        utm_campaign: trk.utm_campaign ?? null,
        utm_medium:   trk.utm_medium ?? null,
        ip:           trk.ip ?? null,
        city:         trk.city ?? null,
        country:      trk.country ?? 'BR',
      })

      return NextResponse.json({ ok: true, event: 'user_joined' })
    }

    // ── Eventos de pagamento ──────────────────────────────────
    const venda = normalizePayload(body)

    if (!venda) {
      return NextResponse.json({ error: 'Payload inválido ou evento ignorado', event: body.event }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('conversions')
      .upsert({
        workspace_id,
        external_id:      venda.external_id,
        produto:          venda.produto,
        categoria:        venda.categoria,
        valor:            venda.valor,
        moeda:            'BRL',
        status:           venda.status,
        utm_source:       venda.utm_source,
        utm_medium:       venda.utm_medium,
        utm_campaign:     venda.utm_campaign,
        utm_content:      venda.utm_content,
        utm_term:         venda.utm_term,
        utm_id:           venda.utm_id,
        customer_name:    venda.customer_name,
        customer_phone:   venda.customer_phone,
        payment_platform: venda.payment_platform,
        payment_method:   venda.payment_method,
        dia:              venda.dia,
      }, { onConflict: 'external_id' })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await updateDailySummary(workspace_id, venda.dia)

    // Envia push notification se venda foi aprovada
    if (venda.status === 'paid') {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id,
          title: '💰 Nova venda aprovada!',
          body: `${venda.customer_name ?? 'Cliente'} — ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.valor)}`,
          url: '/vendas',
        }),
      }).catch(() => {}) // Silencioso — não bloqueia o webhook
    }

    return NextResponse.json({ ok: true, id: venda.external_id, status: venda.status })

  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function normalizePayload(body: any) {
  if (body.event && (body.data || body.transaction)) {
    const d   = body.data ?? body
    const tx  = d.transaction ?? {}
    const cus = d.customer ?? {}
    const trk = d.tracking ?? {}
    const id  = tx.id ?? tx.external_id
    const valor = parseMoney(tx.amount ?? tx.value ?? 0)
    const dia = (tx.paid_at ?? tx.created_at ?? body.timestamp ?? '')
      .toString().includes('T')
      ? (tx.paid_at ?? tx.created_at ?? body.timestamp).split('T')[0]
      : new Date().toISOString().split('T')[0]

    const eventosAceitos = ['payment_approved','payment_created','payment_refunded','payment_chargeback','upsell_approved','downsell_approved','subscription_renewed','subscription_cancelled']
    if (!eventosAceitos.includes(body.event)) return null

    const status =
      body.event === 'payment_approved' || body.event === 'upsell_approved' || body.event === 'downsell_approved' || body.event === 'subscription_renewed' ? 'paid'
      : body.event === 'payment_refunded' ? 'refunded'
      : body.event === 'payment_chargeback' ? 'chargeback'
      : body.event === 'subscription_cancelled' ? 'cancelled'
      : normalizeStatus(tx.status)

    const categoria =
      body.event === 'upsell_approved' ? 'upsell'
      : body.event === 'downsell_approved' ? 'downsell'
      : body.event.includes('subscription') ? 'subscription'
      : tx.type ?? null

    return {
      external_id:      id ? String(id) : `${body.event}_${Date.now()}`,
      produto:          tx.plan_name ?? tx.plan ?? null,
      categoria,
      valor,
      status,
      utm_source:       trk.utm_source ?? null,
      utm_medium:       trk.utm_medium ?? null,
      utm_campaign:     trk.utm_campaign ?? null,
      utm_content:      trk.utm_content ?? null,
      utm_term:         trk.utm_term ?? null,
      utm_id:           trk.utm_id ?? null,
      customer_name:    cus.first_name ? `${cus.first_name} ${cus.last_name ?? ''}`.trim() : null,
      customer_phone:   cus.phone ?? cus.telefone ?? null,
      payment_platform: tx.gateway ?? 'sharkbot',
      payment_method:   tx.payment_method ?? 'pix',
      dia: venda_dia(tx, body),
    }
  }

  if (body.transaction_id || body.transactionId) {
    const id    = body.transaction_id ?? body.transactionId
    const valor = parseMoney(body.amount ?? body.value ?? body.valor ?? 0)
    const dia   = body.created_at?.split('T')[0] ?? new Date().toISOString().split('T')[0]
    return {
      external_id: String(id), produto: body.product ?? body.produto ?? null,
      categoria: body.category ?? body.categoria ?? null, valor,
      status: normalizeStatus(body.status ?? body.payment_status),
      utm_source: body.utm_source ?? null, utm_medium: body.utm_medium ?? null,
      utm_campaign: body.utm_campaign ?? null, utm_content: body.utm_content ?? null,
      utm_term: body.utm_term ?? null, utm_id: body.utm_id ?? null,
      customer_name: body.customer_name ?? body.name ?? null,
      customer_phone: body.customer_phone ?? body.phone ?? null,
      payment_platform: 'sharkbot', payment_method: body.payment_method ?? 'pix', dia,
    }
  }

  if (body.id && body.valor) {
    return {
      external_id: String(body.id), produto: body.produto ?? null,
      categoria: body.categoria ?? null, valor: parseMoney(body.valor),
      status: normalizeStatus(body.status),
      utm_source: body.utm_source ?? null, utm_medium: body.utm_medium ?? null,
      utm_campaign: body.utm_campaign ?? null, utm_content: body.utm_content ?? null,
      utm_term: body.utm_term ?? null, utm_id: body.utm_id ?? null,
      customer_name: body.customer_name ?? null, customer_phone: body.customer_phone ?? null,
      payment_platform: body.platform ?? 'manual', payment_method: body.method ?? 'pix',
      dia: body.dia ?? new Date().toISOString().split('T')[0],
    }
  }

  return null
}

function parseMoney(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0

  const raw = value.trim()
  if (!raw) return 0

  const cleaned = raw
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')

  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function venda_dia(tx: any, body: any): string {
  const raw = tx.paid_at ?? tx.created_at ?? body.timestamp ?? ''
  if (!raw) return new Date().toISOString().split('T')[0]
  const s = typeof raw === 'number' ? new Date(raw * 1000).toISOString() : String(raw)
  return s.includes('T') ? s.split('T')[0] : s.slice(0, 10)
}

function normalizeStatus(status: string): string {
  const s = (status ?? '').toLowerCase()
  if (['paid','pago','approved','aprovado','complete','completed'].includes(s)) return 'paid'
  if (['refunded','reembolsado','refund'].includes(s)) return 'refunded'
  if (['chargeback'].includes(s)) return 'chargeback'
  return 'pending'
}

async function updateDailySummary(workspace_id: string, dia: string) {
  const { data: sales } = await supabaseAdmin.from('conversions').select('valor,status').eq('workspace_id', workspace_id).eq('dia', dia)
  const { data: spend } = await supabaseAdmin.from('ad_spend_daily').select('spend').eq('workspace_id', workspace_id).eq('dia', dia)
  const { data: prefs } = await supabaseAdmin.from('user_prefs').select('custo_produto').eq('workspace_id', workspace_id).single()

  const receita      = (sales ?? []).filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.valor ?? 0), 0)
  const vendas_count = (sales ?? []).filter(s => s.status === 'paid').length
  const gasto_ads    = (spend ?? []).reduce((sum, s) => sum + (s.spend ?? 0), 0)
  const custo_prod   = receita * (prefs?.custo_produto ?? 0)
  const lucro        = receita - gasto_ads - custo_prod

  await supabaseAdmin.from('daily_summary').upsert({
    workspace_id, dia,
    receita_bruta: receita, vendas_count, gasto_ads,
    custo_produto: custo_prod, lucro_liquido: lucro,
    roas:   gasto_ads > 0 ? receita / gasto_ads : null,
    margem: receita > 0 ? (receita - gasto_ads - custo_prod) / receita : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'workspace_id,dia' })
}
