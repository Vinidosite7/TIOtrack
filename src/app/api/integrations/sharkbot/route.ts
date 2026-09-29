import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { normalizeSharkbotWebhook } from '@/lib/integrations/sharkbot-normalizer'
import { processTikTokOutbox } from '@/lib/signals/tiktok'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_RAW_BODY = 1_000_000

function secureEqual(a: string, b: string) {
  const ah = createHash('sha256').update(a).digest()
  const bh = createHash('sha256').update(b).digest()
  return timingSafeEqual(ah, bh)
}

function authFromUrl(req: NextRequest) {
  const url = new URL(req.url)
  const workspaceId = (url.searchParams.get('wid') || '').trim()
  const token = url.searchParams.get('token') || ''
  const secret = process.env.SHARKBOT_WEBHOOK_SECRET || ''

  if (!workspaceId) return { ok: false as const, status: 400, error: 'wid obrigatório' }
  if (!secret) return { ok: false as const, status: 503, error: 'SHARKBOT_WEBHOOK_SECRET não configurado' }
  if (!token || !secureEqual(token, secret)) return { ok: false as const, status: 401, error: 'token inválido' }

  return { ok: true as const, workspaceId, url }
}

function queryWithoutSecret(url: URL) {
  const out: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    if (key.toLowerCase() !== 'token') out[key] = value
  })
  return out
}

function parseBody(raw: string, contentType: string): unknown {
  if (!raw) return {}

  if (contentType.includes('application/json') || contentType.includes('+json')) {
    try { return JSON.parse(raw) } catch { return { _unparsed: raw.slice(0, MAX_RAW_BODY) } }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(raw)
    const out: Record<string, string | string[]> = {}
    params.forEach((value, key) => {
      const current = out[key]
      if (current == null) out[key] = value
      else if (Array.isArray(current)) current.push(value)
      else out[key] = [current, value]
    })
    return out
  }

  try { return JSON.parse(raw) } catch { return { _raw: raw.slice(0, MAX_RAW_BODY) } }
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : { value }
}

function first(...values: unknown[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value)
  }
  return null
}

function eventHints(payloadValue: unknown) {
  const body = asRecord(payloadValue)
  const data = asRecord(body.data)
  const tx = asRecord(data.transaction ?? body.transaction)

  return {
    eventType: first(body.event, body.event_type, body.type, data.event, data.type, body.status, tx.status),
    externalId: first(
      tx.id,
      tx.external_id,
      body.transaction_id,
      body.transactionId,
      body.order_id,
      body.external_id,
      body.id,
    ),
  }
}

function requestHeaders(req: NextRequest) {
  const keys = [
    'content-type',
    'user-agent',
    'x-webhook-signature',
    'x-signature',
    'x-sharkbot-signature',
    'cf-ray',
  ]
  const out: Record<string, string> = {}
  for (const key of keys) {
    const value = req.headers.get(key)
    if (value) out[key] = value
  }
  return out
}

async function relay(rawBody: string, contentType: string, req: NextRequest) {
  const relayUrl = (process.env.SHARKBOT_RELAY_URL || '').trim()
  if (!relayUrl) return { url: null, status: null, error: null }

  try {
    const self = new URL(req.url)
    const destination = new URL(relayUrl)
    if (self.origin === destination.origin && self.pathname === destination.pathname) {
      return { url: relayUrl, status: null, error: 'relay aponta para o próprio endpoint' }
    }

    const headers: Record<string, string> = {}
    if (contentType) headers['content-type'] = contentType
    for (const key of ['x-webhook-signature', 'x-signature', 'x-sharkbot-signature']) {
      const value = req.headers.get(key)
      if (value) headers[key] = value
    }

    const response = await fetch(relayUrl, {
      method: 'POST',
      headers,
      body: rawBody,
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
    })

    return {
      url: relayUrl,
      status: response.status,
      error: response.ok ? null : `HTTP ${response.status}`,
    }
  } catch (error) {
    return {
      url: relayUrl,
      status: null,
      error: error instanceof Error ? error.message.slice(0, 500) : 'Falha no relay',
    }
  }
}

export async function POST(req: NextRequest) {
  const auth = authFromUrl(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const rawBody = (await req.text()).slice(0, MAX_RAW_BODY)
    const contentType = req.headers.get('content-type') || 'application/octet-stream'
    const payload = parseBody(rawBody, contentType)
    const hints = eventHints(payload)

    // Confirma que o workspace existe antes de gravar um webhook externo.
    const { data: workspace, error: workspaceError } = await (supabaseAdmin as any)
      .from('workspaces')
      .select('id')
      .eq('id', auth.workspaceId)
      .maybeSingle()

    if (workspaceError) return NextResponse.json({ error: workspaceError.message }, { status: 500 })
    if (!workspace) return NextResponse.json({ error: 'workspace não encontrado' }, { status: 404 })

    const relayResult = await relay(rawBody, contentType, req)
    const sourceIp = first(req.headers.get('cf-connecting-ip'), req.headers.get('x-forwarded-for'))

    const { data: event, error } = await (supabaseAdmin as any)
      .from('integration_webhook_events')
      .insert({
        workspace_id: auth.workspaceId,
        provider: 'sharkbot',
        event_type: hints.eventType,
        external_id: hints.externalId,
        content_type: contentType,
        payload: asRecord(payload),
        raw_body: rawBody,
        query_params: queryWithoutSecret(auth.url),
        request_headers: requestHeaders(req),
        source_ip: sourceIp,
        relay_url: relayResult.url,
        relay_status: relayResult.status,
        relay_error: relayResult.error,
      })
      .select('id,received_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Capture-first: once the raw webhook is safely stored, normalization becomes
    // best-effort. SharkBot should not disable the webhook because a downstream
    // attribution/signal step had a temporary problem.
    let normalization: Awaited<ReturnType<typeof normalizeSharkbotWebhook>> | null = null
    let normalizeError: string | null = null
    let signalDispatch: {
      attempted: boolean
      processed: number
      sent: number
      retry: number
      failed: number
      error: string | null
    } = {
      attempted: false,
      processed: 0,
      sent: 0,
      retry: 0,
      failed: 0,
      error: null,
    }

    try {
      normalization = await normalizeSharkbotWebhook({
        workspaceId: auth.workspaceId,
        inboxEventId: event.id,
        payload,
      })

      await (supabaseAdmin as any)
        .from('integration_webhook_events')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', event.id)

      // Hobby-safe fast path:
      // purchase -> signal_outbox -> TikTok immediately, without depending on
      // a high-frequency Vercel Cron. Any TikTok failure remains queued/retry
      // and never turns a successfully captured Shark webhook into an error.
      if (
        normalization?.canonicalEventName === 'purchase' &&
        normalization.signalDestinations.includes('tiktok')
      ) {
        signalDispatch.attempted = true
        try {
          const dispatch = await processTikTokOutbox({
            workspaceId: auth.workspaceId,
            limit: 5,
          })
          signalDispatch = {
            attempted: true,
            processed: dispatch.processed,
            sent: dispatch.sent,
            retry: dispatch.retry,
            failed: dispatch.failed,
            error: null,
          }
        } catch (dispatchError) {
          signalDispatch.error = dispatchError instanceof Error
            ? dispatchError.message.slice(0, 1000)
            : 'Falha ao despachar signal TikTok'
          console.error('[TioTrack] TikTok immediate dispatch failed:', dispatchError)
        }
      }
    } catch (normalizationError) {
      normalizeError = normalizationError instanceof Error
        ? normalizationError.message.slice(0, 1000)
        : 'Falha ao normalizar webhook'
      console.error('[TioTrack] SharkBot normalization failed:', normalizationError)
    }

    return NextResponse.json({
      ok: true,
      captured: true,
      event_id: event.id,
      event_type: hints.eventType,
      external_id: hints.externalId,
      normalized: normalization?.handled ?? false,
      canonical_event: normalization?.canonicalEventName ?? null,
      canonical_event_id: normalization?.trackingEventId ?? null,
      order_record_id: normalization?.orderRecordId ?? null,
      signal_destinations: normalization?.signalDestinations ?? [],
      signal_dispatch: signalDispatch,
      normalize_error: normalizeError,
      relay: relayResult.url ? { status: relayResult.status, error: relayResult.error } : null,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const auth = authFromUrl(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const limit = Math.min(20, Math.max(1, Number(auth.url.searchParams.get('limit') || 5)))
  const { data, error } = await (supabaseAdmin as any)
    .from('integration_webhook_events')
    .select('id,provider,event_type,external_id,content_type,payload,source_ip,relay_status,relay_error,received_at')
    .eq('workspace_id', auth.workspaceId)
    .eq('provider', 'sharkbot')
    .order('received_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, events: data || [] })
}
