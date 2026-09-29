import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  dedupKey,
  detectPlatform,
  eventNameForStatus,
  normalizePaymentStatus,
  platformClick,
  safeAmountCents,
} from '@/lib/tracking/core'

type JsonRecord = Record<string, any>

type NormalizeInput = {
  workspaceId: string
  inboxEventId: string
  payload: unknown
}

export type SharkbotNormalizeResult = {
  handled: boolean
  providerEvent: string | null
  canonicalEventName: string | null
  trackingEventId: string | null
  orderRecordId: string | null
  signalDestinations: string[]
  clickId: string | null
  leadId: string | null
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {}
}

function first(...values: unknown[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return null
}

function firstName(customer: JsonRecord) {
  return [first(customer.first_name), first(customer.last_name)].filter(Boolean).join(' ') || null
}

function eventTime(body: JsonRecord, data: JsonRecord, transaction: JsonRecord, providerEvent: string | null) {
  const explicit = providerEvent === 'payment_approved'
    ? first(transaction.paid_at, transaction.created_at)
    : providerEvent === 'payment_created'
      ? first(transaction.created_at)
      : first(data.joined_at)

  if (explicit) return explicit

  const unix = Number(body.timestamp)
  if (Number.isFinite(unix) && unix > 0) return new Date(unix * 1000).toISOString()
  return new Date().toISOString()
}

function tiotrackClickId(tracking: JsonRecord, body: JsonRecord) {
  const candidates = [
    tracking.click_id,
    tracking.clickId,
    tracking.kwclid,
    tracking.xcod,
    tracking.sck,
    body.click_id,
  ]

  for (const candidate of candidates) {
    const value = first(candidate)
    if (value && value.startsWith('tio_')) return value
  }
  return null
}

function signalDestinations(config: unknown) {
  const cfg = asRecord(config)
  const tracking = asRecord(cfg.tracking)
  const raw = Array.isArray(tracking.destinations) ? tracking.destinations : []
  return [...new Set(
    raw.map(String).map(v => v.toLowerCase()).filter(v => ['tiktok', 'meta', 'kwai', 'google'].includes(v))
  )]
}

async function inferFunnelFromLandingUrl(workspaceId: string, landingUrl: string | null) {
  if (!landingUrl) return null

  let url: URL
  try { url = new URL(landingUrl) } catch { return null }

  const { data: domain } = await (supabaseAdmin as any)
    .from('traffic_domains')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('hostname', url.hostname.toLowerCase())
    .maybeSingle()

  if (!domain?.id) return null

  const { data: routes } = await (supabaseAdmin as any)
    .from('traffic_routes')
    .select('id,path_prefix,page_id,origin_type,enabled')
    .eq('workspace_id', workspaceId)
    .eq('domain_id', domain.id)
    .eq('enabled', true)
    .eq('origin_type', 'page')

  const route = (routes || [])
    .filter((r: any) => r.page_id && url.pathname.startsWith(r.path_prefix || '/'))
    .sort((a: any, b: any) => String(b.path_prefix || '/').length - String(a.path_prefix || '/').length)[0]

  if (!route?.page_id) return null

  const { data: step } = await (supabaseAdmin as any)
    .from('funnel_steps')
    .select('id,funnel_id,step_key')
    .eq('workspace_id', workspaceId)
    .eq('page_id', route.page_id)
    .order('step_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!step?.funnel_id) return null

  const { data: funnel } = await (supabaseAdmin as any)
    .from('funnels')
    .select('id,product_id,config')
    .eq('workspace_id', workspaceId)
    .eq('id', step.funnel_id)
    .maybeSingle()

  if (!funnel) return null

  return {
    productId: funnel.product_id || null,
    funnelId: funnel.id || null,
    funnelStepId: step.id || null,
    stepKey: step.step_key || null,
    destinations: signalDestinations(funnel.config),
  }
}

async function resolveClickContext(workspaceId: string, clickId: string | null) {
  if (!clickId) {
    return {
      visitorId: null, sessionId: null, productId: null, funnelId: null,
      funnelStepId: null, stepKey: null, landingUrl: null, referer: null,
      utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null,
      utm_term: null, utm_id: null, ttclid: null, fbclid: null, gclid: null,
      destinations: [] as string[],
    }
  }

  const { data: session } = await (supabaseAdmin as any)
    .from('sessions')
    .select('visitor_id,session_id,click_id,product_id,funnel_id,landing_url,referer,utm_source,utm_medium,utm_campaign,utm_content,utm_term,utm_id,ttclid,fbclid,gclid,last_seen_at')
    .eq('workspace_id', workspaceId)
    .eq('click_id', clickId)
    .order('last_seen_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let fallback: any = null
  if (!session) {
    const { data } = await (supabaseAdmin as any)
      .from('traffic_events')
      .select('visitor_id,session_id,click_id,product_id,funnel_id,step_key,landing_url,referer,utm_source,utm_medium,utm_campaign,utm_content,utm_term,utm_id,ttclid,fbclid,gclid,created_at')
      .eq('workspace_id', workspaceId)
      .eq('click_id', clickId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    fallback = data
  }

  const base = session || fallback || {}
  let productId = base.product_id || null
  let funnelId = base.funnel_id || null
  let funnelStepId = null
  let stepKey = base.step_key || null
  let destinations: string[] = []

  if (funnelId) {
    const { data: funnel } = await (supabaseAdmin as any)
      .from('funnels')
      .select('id,product_id,config')
      .eq('workspace_id', workspaceId)
      .eq('id', funnelId)
      .maybeSingle()

    if (funnel) {
      productId = productId || funnel.product_id || null
      destinations = signalDestinations(funnel.config)
    }
  }

  if (!funnelId) {
    const inferred = await inferFunnelFromLandingUrl(workspaceId, base.landing_url || null)
    if (inferred) {
      productId = inferred.productId
      funnelId = inferred.funnelId
      funnelStepId = inferred.funnelStepId
      stepKey = inferred.stepKey
      destinations = inferred.destinations
    }
  }

  return {
    visitorId: base.visitor_id || null,
    sessionId: base.session_id || null,
    productId,
    funnelId,
    funnelStepId,
    stepKey,
    landingUrl: base.landing_url || null,
    referer: base.referer || null,
    utm_source: base.utm_source || null,
    utm_medium: base.utm_medium || null,
    utm_campaign: base.utm_campaign || null,
    utm_content: base.utm_content || null,
    utm_term: base.utm_term || null,
    utm_id: base.utm_id || null,
    ttclid: base.ttclid || null,
    fbclid: base.fbclid || null,
    gclid: base.gclid || null,
    destinations,
  }
}

function attributionTouch(tracking: JsonRecord, context: any) {
  const rawKwaiClick = first(tracking.kwai_click_id, tracking.kwclid)
  return {
    utm_source: first(tracking.utm_source, context.utm_source),
    utm_medium: first(tracking.utm_medium, context.utm_medium),
    utm_campaign: first(tracking.utm_campaign, context.utm_campaign),
    utm_content: first(tracking.utm_content, context.utm_content),
    utm_term: first(tracking.utm_term, context.utm_term),
    utm_id: first(tracking.utm_id, context.utm_id),
    ttclid: first(tracking.ttclid, context.ttclid),
    fbclid: first(tracking.fbclid, context.fbclid),
    gclid: first(tracking.gclid, context.gclid),
    kwclid: rawKwaiClick,
    kwai_unit_id: first(tracking.kwai_unit_id),
    kwai_pixel_id: first(tracking.kwai_pixel_id),
    ip: first(tracking.ip),
    city: first(tracking.city),
    country: first(tracking.country),
    user_agent: first(tracking.user_agent),
    link_id: first(tracking.link_id),
    landing_url: context.landingUrl,
    referer: context.referer,
  }
}

async function upsertLead(input: {
  workspaceId: string
  leadId: string
  clickId: string | null
  customer: JsonRecord
  bot: JsonRecord
  flow: JsonRecord
  tracking: JsonRecord
  context: any
  contactCaptureStatus: string | null
}) {
  const touch = attributionTouch(input.tracking, input.context)
  const platform = detectPlatform({
    ttclid: touch.ttclid,
    fbclid: touch.fbclid,
    gclid: touch.gclid,
    kwclid: touch.kwclid,
    utm_source: touch.utm_source,
  })
  const click = platformClick({
    ttclid: touch.ttclid,
    fbclid: touch.fbclid,
    gclid: touch.gclid,
    kwclid: touch.kwclid,
  })

  const { data: existing } = await (supabaseAdmin as any)
    .from('tracking_leads')
    .select('id,first_touch,first_seen_at,metadata,product_id,funnel_id')
    .eq('workspace_id', input.workspaceId)
    .eq('lead_id', input.leadId)
    .maybeSingle()

  const metadata = {
    ...(asRecord(existing?.metadata)),
    provider: 'sharkbot',
    sharkbot: {
      customer_id: first(input.customer.id),
      telegram_id: first(input.customer.telegram_id),
      username: first(input.customer.username),
      is_vip: Boolean(input.customer.is_vip),
      bot_id: first(input.bot.id),
      bot_username: first(input.bot.username),
      flow_id: first(input.flow.id),
      flow_name: first(input.flow.name),
      contact_capture_status: input.contactCaptureStatus,
    },
  }

  if (existing) {
    await (supabaseAdmin as any)
      .from('tracking_leads')
      .update({
        visitor_id: input.context.visitorId,
        session_id: input.context.sessionId,
        click_id: input.clickId,
        product_id: input.context.productId || existing.product_id || null,
        funnel_id: input.context.funnelId || existing.funnel_id || null,
        platform,
        click_param: click.param,
        click_value: click.value,
        last_touch: touch,
        last_seen_at: new Date().toISOString(),
        metadata,
      })
      .eq('id', existing.id)
    return
  }

  await (supabaseAdmin as any)
    .from('tracking_leads')
    .insert({
      workspace_id: input.workspaceId,
      lead_id: input.leadId,
      visitor_id: input.context.visitorId,
      session_id: input.context.sessionId,
      click_id: input.clickId,
      product_id: input.context.productId,
      funnel_id: input.context.funnelId,
      platform,
      click_param: click.param,
      click_value: click.value,
      first_landing_url: input.context.landingUrl,
      first_referer: input.context.referer,
      first_touch: touch,
      last_touch: touch,
      metadata,
    })
}

async function upsertOrder(input: {
  workspaceId: string
  transaction: JsonRecord
  customer: JsonRecord
  bot: JsonRecord
  flow: JsonRecord
  tracking: JsonRecord
  context: any
  clickId: string | null
  leadId: string | null
  providerEvent: string
}) {
  const externalId = first(input.transaction.id, input.transaction.external_id)
  if (!externalId) return null

  const incomingStatus = normalizePaymentStatus(
    input.providerEvent === 'payment_approved'
      ? 'paid'
      : input.providerEvent === 'payment_created'
        ? 'waiting_payment'
        : input.transaction.status
  )
  if (!incomingStatus) return null

  const { data: existing } = await (supabaseAdmin as any)
    .from('orders')
    .select('id,status,paid_at,metadata,product_id,funnel_id,lead_id,session_id,click_id')
    .eq('workspace_id', input.workspaceId)
    .eq('provider', 'sharkbot')
    .eq('external_id', externalId)
    .maybeSingle()

  const keepPaid = existing?.status === 'paid' && incomingStatus !== 'paid'
  const status = keepPaid ? 'paid' : incomingStatus
  const paidAt = status === 'paid'
    ? first(input.transaction.paid_at, existing?.paid_at, new Date().toISOString())
    : existing?.paid_at || null

  const metadata = {
    ...(asRecord(existing?.metadata)),
    sharkbot: {
      transaction_external_id: first(input.transaction.external_id),
      gateway: first(input.transaction.gateway),
      plan_id: first(input.transaction.plan_id),
      plan_name: first(input.transaction.plan_name),
      transaction_type: first(input.transaction.type),
      sales_code: first(input.transaction.sales_code),
      bot_id: first(input.bot.id),
      bot_username: first(input.bot.username),
      flow_id: first(input.flow.id),
      flow_name: first(input.flow.name),
      tracking: input.tracking,
      provider_event: input.providerEvent,
    },
  }

  const row = {
    workspace_id: input.workspaceId,
    product_id: input.context.productId || existing?.product_id || null,
    funnel_id: input.context.funnelId || existing?.funnel_id || null,
    lead_id: input.leadId || existing?.lead_id || null,
    session_id: input.context.sessionId || existing?.session_id || null,
    click_id: input.clickId || existing?.click_id || null,
    provider: 'sharkbot',
    external_id: externalId,
    status,
    amount_cents: safeAmountCents(input.transaction.amount),
    currency: first(input.transaction.currency) || 'BRL',
    customer_name: firstName(input.customer),
    customer_email: first(input.customer.email),
    customer_phone: first(input.customer.phone),
    payment_method: first(input.transaction.payment_method),
    metadata,
    updated_at: new Date().toISOString(),
    paid_at: paidAt,
  }

  const { data: order, error } = await (supabaseAdmin as any)
    .from('orders')
    .upsert(row, { onConflict: 'workspace_id,provider,external_id' })
    .select('id,external_id,status,paid_at')
    .single()

  if (error) throw new Error(error.message)
  return order
}

async function upsertCanonicalEvent(input: {
  workspaceId: string
  inboxEventId: string
  providerEvent: string
  body: JsonRecord
  data: JsonRecord
  transaction: JsonRecord
  tracking: JsonRecord
  context: any
  clickId: string | null
  leadId: string | null
  order: any
}) {
  const canonicalStatus = input.providerEvent === 'payment_created'
    ? 'waiting_payment'
    : input.providerEvent === 'payment_approved'
      ? 'paid'
      : null

  const canonicalEventName = input.providerEvent === 'user_joined'
    ? 'lead'
    : canonicalStatus
      ? eventNameForStatus(canonicalStatus)
      : null

  if (!canonicalEventName) return null

  const entityId = first(
    input.transaction.id,
    input.data.customer?.id,
    input.body.webhook_id,
    input.inboxEventId,
  ) || input.inboxEventId

  const stableEventId = `sharkbot:${input.providerEvent}:${entityId}`
  const touch = attributionTouch(input.tracking, input.context)

  const row = {
    workspace_id: input.workspaceId,
    event_id: stableEventId,
    dedup_key: dedupKey([input.workspaceId, 'sharkbot', input.providerEvent, entityId]),
    event_name: canonicalEventName,
    source: 'webhook',
    lead_id: input.leadId,
    visitor_id: input.context.visitorId,
    session_id: input.context.sessionId,
    click_id: input.clickId,
    product_id: input.context.productId,
    funnel_id: input.context.funnelId,
    funnel_step_id: input.context.funnelStepId,
    step_key: input.context.stepKey,
    order_id: first(input.transaction.id),
    amount_cents: input.transaction.id ? safeAmountCents(input.transaction.amount) : null,
    currency: first(input.transaction.currency),
    status: canonicalStatus,
    url: input.context.landingUrl,
    referer: input.context.referer,
    utm_source: touch.utm_source,
    utm_medium: touch.utm_medium,
    utm_campaign: touch.utm_campaign,
    utm_content: touch.utm_content,
    utm_term: touch.utm_term,
    utm_id: touch.utm_id,
    ttclid: touch.ttclid,
    fbclid: touch.fbclid,
    gclid: touch.gclid,
    metadata: {
      provider: 'sharkbot',
      provider_event: input.providerEvent,
      webhook_inbox_id: input.inboxEventId,
      webhook_id: first(input.body.webhook_id),
      order_record_id: input.order?.id || null,
      bot: input.data.bot || {},
      flow: input.data.flow || {},
      tracking: input.tracking,
      contact_capture_status: first(input.data.contact_capture_status),
    },
    occurred_at: eventTime(input.body, input.data, input.transaction, input.providerEvent),
  }

  const { data: event, error } = await (supabaseAdmin as any)
    .from('tracking_events')
    .upsert(row, { onConflict: 'workspace_id,dedup_key' })
    .select('id,event_name')
    .single()

  if (error) throw new Error(error.message)
  return event
}

async function queueSignals(workspaceId: string, event: any, destinations: string[]) {
  if (!event?.id || event.event_name !== 'purchase' || !destinations.length) return []

  const rows = destinations.map(destination => ({
    workspace_id: workspaceId,
    tracking_event_id: event.id,
    destination,
    event_name: 'purchase',
    status: 'queued',
    next_attempt_at: new Date().toISOString(),
  }))

  const { error } = await (supabaseAdmin as any)
    .from('signal_outbox')
    .upsert(rows, { onConflict: 'tracking_event_id,destination,event_name', ignoreDuplicates: true })

  if (error) throw new Error(error.message)
  return destinations
}

export async function normalizeSharkbotWebhook(input: NormalizeInput): Promise<SharkbotNormalizeResult> {
  const body = asRecord(input.payload)
  const data = asRecord(body.data)
  const customer = asRecord(data.customer)
  const bot = asRecord(data.bot)
  const flow = asRecord(data.flow)
  const tracking = asRecord(data.tracking)
  const transaction = asRecord(data.transaction)
  const providerEvent = first(body.event)

  if (!providerEvent || !['user_joined', 'payment_created', 'payment_approved'].includes(providerEvent)) {
    return {
      handled: false,
      providerEvent,
      canonicalEventName: null,
      trackingEventId: null,
      orderRecordId: null,
      signalDestinations: [],
      clickId: null,
      leadId: null,
    }
  }

  const clickId = tiotrackClickId(tracking, body)
  const leadId = first(customer.id, customer.telegram_id)
  const context = await resolveClickContext(input.workspaceId, clickId)

  // Shark remains useful even without a Tiotrack presell. In that mode clickId
  // can be null, while the webhook's own UTMs/ad click IDs are still preserved.
  if (leadId) {
    await upsertLead({
      workspaceId: input.workspaceId,
      leadId,
      clickId,
      customer,
      bot,
      flow,
      tracking,
      context,
      contactCaptureStatus: first(data.contact_capture_status),
    })
  }

  const order = transaction.id
    ? await upsertOrder({
        workspaceId: input.workspaceId,
        transaction,
        customer,
        bot,
        flow,
        tracking,
        context,
        clickId,
        leadId,
        providerEvent,
      })
    : null

  const canonicalEvent = await upsertCanonicalEvent({
    workspaceId: input.workspaceId,
    inboxEventId: input.inboxEventId,
    providerEvent,
    body,
    data,
    transaction,
    tracking,
    context,
    clickId,
    leadId,
    order,
  })

  const queued = await queueSignals(
    input.workspaceId,
    canonicalEvent,
    context.destinations || [],
  )

  return {
    handled: true,
    providerEvent,
    canonicalEventName: canonicalEvent?.event_name || null,
    trackingEventId: canonicalEvent?.id || null,
    orderRecordId: order?.id || null,
    signalDestinations: queued,
    clickId,
    leadId,
  }
}
