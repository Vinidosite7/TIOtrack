import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyApiKey } from '@/lib/tracking/api-keys'
import {
  dedupKey,
  detectPlatform,
  eventId,
  eventNameForStatus,
  normalizePaymentStatus,
  safeAmountCents,
} from '@/lib/tracking/core'

function bearer(req: NextRequest) {
  const value = req.headers.get('authorization') || ''
  return value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : ''
}

function isoDate(value?: string | null) {
  if (!value) return new Date().toISOString()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiKey(bearer(req), 'conversions:write')
    if (!auth) return NextResponse.json({ error: 'API key inválida ou sem escopo conversions:write' }, { status: 401 })

    const body = await req.json()
    const status = normalizePaymentStatus(body?.status)
    if (!status) return NextResponse.json({ error: 'status inválido' }, { status: 400 })

    const externalId = String(body?.order_id || body?.external_id || '').trim()
    if (!externalId) return NextResponse.json({ error: 'order_id obrigatório' }, { status: 400 })

    const provider = String(body?.provider || 'api').trim().toLowerCase().slice(0, 64) || 'api'
    const currency = String(body?.currency || 'BRL').trim().toUpperCase().slice(0, 8) || 'BRL'
    const amountCents = safeAmountCents(body?.amount_cents ?? body?.amount ?? body?.value ?? 0, body?.amount_cents != null)

    let lead: any = null
    if (body?.lead_id) {
      const { data } = await (supabaseAdmin as any).from('tracking_leads')
        .select('*').eq('workspace_id', auth.workspaceId).eq('lead_id', String(body.lead_id)).maybeSingle()
      lead = data
    }
    if (!lead && body?.click_id) {
      const { data } = await (supabaseAdmin as any).from('tracking_leads')
        .select('*').eq('workspace_id', auth.workspaceId).eq('click_id', String(body.click_id))
        .order('last_seen_at', { ascending: false }).limit(1).maybeSingle()
      lead = data
    }
    if (!lead && body?.session_id) {
      const { data } = await (supabaseAdmin as any).from('tracking_leads')
        .select('*').eq('workspace_id', auth.workspaceId).eq('session_id', String(body.session_id))
        .order('last_seen_at', { ascending: false }).limit(1).maybeSingle()
      lead = data
    }

    const productId = body?.product_id || lead?.product_id || null
    const funnelId = body?.funnel_id || lead?.funnel_id || null
    const leadId = body?.lead_id || lead?.lead_id || null
    const sessionId = body?.session_id || lead?.session_id || null
    const clickId = body?.click_id || lead?.click_id || null
    const occurredAt = isoDate(body?.occurred_at || body?.timestamp)

    const orderPayload = {
      workspace_id: auth.workspaceId,
      product_id: productId,
      funnel_id: funnelId,
      lead_id: leadId,
      session_id: sessionId,
      click_id: clickId,
      provider,
      external_id: externalId,
      status,
      amount_cents: amountCents,
      currency,
      customer_name: body?.customer?.name ?? body?.customer_name ?? null,
      customer_email: body?.customer?.email ?? body?.customer_email ?? null,
      customer_phone: body?.customer?.phone ?? body?.customer_phone ?? null,
      payment_method: body?.payment_method ?? body?.method ?? null,
      metadata: body?.metadata ?? {},
      updated_at: new Date().toISOString(),
      paid_at: status === 'paid' ? occurredAt : null,
    }

    const { data: order, error: orderError } = await (supabaseAdmin as any)
      .from('orders')
      .upsert(orderPayload, { onConflict: 'workspace_id,provider,external_id' })
      .select('*')
      .single()
    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

    const canonicalName = eventNameForStatus(status)
    const canonicalEventId = String(body?.event_id || eventId('srv'))
    const dedup = dedupKey([auth.workspaceId, provider, externalId, status])

    const touch = lead?.last_touch || {}
    const eventPayload = {
      workspace_id: auth.workspaceId,
      event_id: canonicalEventId,
      dedup_key: dedup,
      event_name: canonicalName,
      source: 'server',
      lead_id: leadId,
      visitor_id: lead?.visitor_id ?? null,
      session_id: sessionId,
      click_id: clickId,
      product_id: productId,
      funnel_id: funnelId,
      step_key: body?.step_key ?? null,
      order_id: externalId,
      amount_cents: amountCents,
      currency,
      status,
      url: body?.url ?? null,
      referer: body?.referer ?? null,
      utm_source: body?.utm_source ?? touch?.utm_source ?? null,
      utm_medium: body?.utm_medium ?? touch?.utm_medium ?? null,
      utm_campaign: body?.utm_campaign ?? touch?.utm_campaign ?? null,
      utm_content: body?.utm_content ?? touch?.utm_content ?? null,
      utm_term: body?.utm_term ?? touch?.utm_term ?? null,
      utm_id: body?.utm_id ?? touch?.utm_id ?? null,
      ttclid: body?.ttclid ?? touch?.ttclid ?? null,
      fbclid: body?.fbclid ?? touch?.fbclid ?? null,
      gclid: body?.gclid ?? touch?.gclid ?? null,
      metadata: body?.metadata ?? {},
      occurred_at: occurredAt,
    }

    const { data: trackingEvent, error: eventError } = await (supabaseAdmin as any)
      .from('tracking_events')
      .insert(eventPayload)
      .select('*')
      .single()

    const duplicate = eventError?.code === '23505'
    if (eventError && !duplicate) return NextResponse.json({ error: eventError.message }, { status: 500 })

    // Keep the legacy conversions table alive while the dashboard migrates to Orders/Events.
    let productName: string | null = body?.product_name ?? null
    if (!productName && productId) {
      const { data } = await (supabaseAdmin as any).from('products').select('name').eq('id', productId).maybeSingle()
      productName = data?.name ?? null
    }
    await (supabaseAdmin as any).from('conversions').upsert({
      workspace_id: auth.workspaceId,
      external_id: externalId,
      order_id: externalId,
      produto: productName,
      valor: amountCents / 100,
      moeda: currency,
      status: status === 'waiting_payment' ? 'pending' : status,
      lead_id: leadId,
      session_id: sessionId,
      click_id: clickId,
      product_id: productId,
      funnel_id: funnelId,
      ttclid: eventPayload.ttclid,
      fbclid: eventPayload.fbclid,
      gclid: eventPayload.gclid,
      utm_source: eventPayload.utm_source,
      utm_medium: eventPayload.utm_medium,
      utm_campaign: eventPayload.utm_campaign,
      utm_content: eventPayload.utm_content,
      utm_term: eventPayload.utm_term,
      utm_id: eventPayload.utm_id,
      customer_name: orderPayload.customer_name,
      customer_phone: orderPayload.customer_phone,
      payment_platform: provider,
      payment_method: orderPayload.payment_method,
      dia: occurredAt.slice(0, 10),
    }, { onConflict: 'external_id' })

    if (status === 'paid') {
      if (leadId) await (supabaseAdmin as any).from('sessions').update({ converteu: true }).eq('workspace_id', auth.workspaceId).eq('lead_id', leadId)
      else if (sessionId) await (supabaseAdmin as any).from('sessions').update({ converteu: true }).eq('workspace_id', auth.workspaceId).eq('session_id', sessionId)
      else if (clickId) await (supabaseAdmin as any).from('sessions').update({ converteu: true }).eq('workspace_id', auth.workspaceId).eq('click_id', clickId)
    }

    // Queue a signal only for attributable paid/checkout events. Dispatcher maps canonical names per network later.
    if (!duplicate && trackingEvent && ['initiate_checkout', 'payment_created', 'purchase'].includes(canonicalName)) {
      const platform = lead?.platform || detectPlatform(eventPayload)
      if (['tiktok', 'meta', 'kwai', 'google'].includes(platform)) {
        await (supabaseAdmin as any).from('signal_outbox').upsert({
          workspace_id: auth.workspaceId,
          tracking_event_id: trackingEvent.id,
          destination: platform,
          event_name: canonicalName,
          status: 'queued',
          next_attempt_at: new Date().toISOString(),
        }, { onConflict: 'tracking_event_id,destination,event_name' })
      }
    }

    return NextResponse.json({
      ok: true,
      duplicate,
      order: { id: order.id, external_id: externalId, status, amount_cents: amountCents, currency },
      event: trackingEvent ? { id: trackingEvent.id, event_id: trackingEvent.event_id, event_name: canonicalName } : null,
      attributed: Boolean(leadId || clickId || sessionId),
      lead_id: leadId,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 })
  }
}
