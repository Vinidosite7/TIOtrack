import { supabaseAdmin } from '@/lib/supabase-admin'

type JsonRecord = Record<string, any>

type TikTokCredentials = {
  pixelCode: string
  accessToken: string
  source: 'env' | 'workspace'
}

type ProcessResult = {
  id: string
  ok: boolean
  status: 'sent' | 'retry' | 'failed' | 'skipped'
  message?: string
  tiktokCode?: number | string | null
  tiktokMessage?: string | null
}

const TIKTOK_TRACK_URL = 'https://business-api.tiktok.com/open_api/v1.2/pixel/track/'
const MAX_ATTEMPTS = 5

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

async function decryptWorkspaceToken(ciphertext: string) {
  const keyB64 = (process.env.TIKTOK_INTEGRATION_ENCRYPTION_KEY || '').trim()
  if (!keyB64) throw new Error('TIKTOK_INTEGRATION_ENCRYPTION_KEY não configurado')

  const { createDecipheriv } = await import('crypto')
  const key = Buffer.from(keyB64, 'base64')
  if (key.length !== 32) {
    throw new Error('TIKTOK_INTEGRATION_ENCRYPTION_KEY precisa decodificar para 32 bytes')
  }

  const parts = ciphertext.split('.')
  if (parts.length !== 3) throw new Error('Token TikTok criptografado inválido')

  const iv = Buffer.from(parts[0], 'base64')
  const tag = Buffer.from(parts[1], 'base64')
  const encrypted = Buffer.from(parts[2], 'base64')

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return plain.toString('utf8')
}

/**
 * Prefer workspace-scoped credentials stored in Tiotrack.
 * During the transition, falls back to the Vercel env vars already used in V1.
 */
export async function getTikTokCredentials(workspaceId: string): Promise<TikTokCredentials> {
  const { data: integration, error } = await (supabaseAdmin as any)
    .from('tiktok_integrations')
    .select('pixel_code,access_token_encrypted,enabled')
    .eq('workspace_id', workspaceId)
    .eq('enabled', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // If the table is not installed yet or this workspace has no saved integration,
  // preserve the already-proven ENV flow.
  if (!error && integration?.pixel_code && integration?.access_token_encrypted) {
    const accessToken = await decryptWorkspaceToken(String(integration.access_token_encrypted))
    return {
      pixelCode: String(integration.pixel_code).trim(),
      accessToken: accessToken.trim(),
      source: 'workspace',
    }
  }

  const pixelCode = (process.env.TIKTOK_PIXEL_CODE || '').trim()
  const accessToken = (process.env.TIKTOK_EVENTS_ACCESS_TOKEN || '').trim()

  if (!pixelCode) throw new Error('TikTok Pixel não configurado no workspace nem em TIKTOK_PIXEL_CODE')
  if (!accessToken) throw new Error('TikTok token não configurado no workspace nem em TIKTOK_EVENTS_ACCESS_TOKEN')

  return { pixelCode, accessToken, source: 'env' }
}

function retryDelayMinutes(attempts: number) {
  if (attempts <= 1) return 2
  if (attempts === 2) return 5
  if (attempts === 3) return 15
  if (attempts === 4) return 60
  return 360
}

async function markRetry(outboxId: string, previousAttempts: number, message: string, response?: unknown) {
  const attempts = previousAttempts + 1
  const terminal = attempts >= MAX_ATTEMPTS
  const nextAttemptAt = new Date(Date.now() + retryDelayMinutes(attempts) * 60_000).toISOString()

  await (supabaseAdmin as any)
    .from('signal_outbox')
    .update({
      status: terminal ? 'failed' : 'retry',
      attempts,
      next_attempt_at: nextAttemptAt,
      last_error: message.slice(0, 1500),
      response: response ? asRecord(response) : null,
    })
    .eq('id', outboxId)

  return terminal ? 'failed' as const : 'retry' as const
}

function buildTikTokPayload(event: JsonRecord, testEventCode?: string | null) {
  const metadata = asRecord(event.metadata)
  const tracking = asRecord(metadata.tracking)

  const ttclid = first(event.ttclid, tracking.ttclid)
  const pageUrl = first(event.url, tracking.landing_url)
  const referrer = first(event.referer, tracking.referer)
  const ip = first(tracking.ip)
  const userAgent = first(tracking.user_agent)

  const value = Number(event.amount_cents || 0) / 100
  const currency = first(event.currency) || 'BRL'

  const context: JsonRecord = {}

  if (ttclid) context.ad = { callback: ttclid }
  if (pageUrl || referrer) {
    context.page = {
      ...(pageUrl ? { url: pageUrl } : {}),
      ...(referrer ? { referrer } : {}),
    }
  }
  if (userAgent) context.user_agent = userAgent
  if (ip) context.ip = ip

  const payload: JsonRecord = {
    pixel_code: '__PIXEL_CODE__',
    event: 'CompletePayment',
    event_id: first(event.event_id, event.id),
    timestamp: new Date(event.occurred_at || event.received_at || Date.now()).toISOString(),
    context,
    properties: {
      currency,
      value,
      content_type: 'product',
      contents: [
        {
          content_id: first(event.product_id, event.order_id) || 'tiotrack-order',
          quantity: 1,
          price: value,
        },
      ],
    },
  }

  if (testEventCode) payload.test_event_code = testEventCode
  return payload
}

async function processOne(row: JsonRecord, testEventCode?: string | null): Promise<ProcessResult> {
  const outboxId = String(row.id)
  const previousAttempts = Number(row.attempts || 0)

  if (!row.tracking_event_id) {
    const status = await markRetry(outboxId, previousAttempts, 'tracking_event_id ausente')
    return { id: outboxId, ok: false, status, message: 'tracking_event_id ausente' }
  }

  const { data: event, error: eventError } = await (supabaseAdmin as any)
    .from('tracking_events')
    .select('id,workspace_id,event_id,event_name,click_id,product_id,order_id,amount_cents,currency,url,referer,ttclid,metadata,occurred_at,received_at,status')
    .eq('id', row.tracking_event_id)
    .maybeSingle()

  if (eventError || !event) {
    const message = eventError?.message || 'tracking_event não encontrado'
    const status = await markRetry(outboxId, previousAttempts, message)
    return { id: outboxId, ok: false, status, message }
  }

  if (event.event_name !== 'purchase') {
    await (supabaseAdmin as any)
      .from('signal_outbox')
      .update({ status: 'cancelled', last_error: 'Evento não é purchase' })
      .eq('id', outboxId)
    return { id: outboxId, ok: false, status: 'skipped', message: 'Evento não é purchase' }
  }

  let credentials: TikTokCredentials
  try {
    credentials = await getTikTokCredentials(event.workspace_id)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Credenciais TikTok inválidas'
    const status = await markRetry(outboxId, previousAttempts, message)
    return { id: outboxId, ok: false, status, message }
  }

  await (supabaseAdmin as any)
    .from('signal_outbox')
    .update({ status: 'processing' })
    .eq('id', outboxId)

  const payload = buildTikTokPayload(event, testEventCode)
  payload.pixel_code = credentials.pixelCode

  try {
    const response = await fetch(TIKTOK_TRACK_URL, {
      method: 'POST',
      headers: {
        'Access-Token': credentials.accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12_000),
    })

    const rawText = await response.text()
    let body: JsonRecord = {}
    try { body = JSON.parse(rawText) } catch { body = { raw: rawText.slice(0, 4000) } }

    const code = body.code ?? null
    const message = first(body.message, body.msg) || null
    const accepted = response.ok && (code === 0 || code === '0' || code === null)

    if (!accepted) {
      const errorMessage = `TikTok HTTP ${response.status}${code !== null ? ` / code ${code}` : ''}${message ? `: ${message}` : ''}`
      const status = await markRetry(outboxId, previousAttempts, errorMessage, {
        http_status: response.status,
        body,
      })
      return {
        id: outboxId,
        ok: false,
        status,
        message: errorMessage,
        tiktokCode: code,
        tiktokMessage: message,
      }
    }

    await (supabaseAdmin as any)
      .from('signal_outbox')
      .update({
        status: 'sent',
        attempts: previousAttempts + 1,
        last_error: null,
        response: {
          http_status: response.status,
          body,
          credential_source: credentials.source,
          payload_summary: {
            pixel_code: credentials.pixelCode,
            event: payload.event,
            event_id: payload.event_id,
            timestamp: payload.timestamp,
            ttclid_present: Boolean(payload.context?.ad?.callback),
            value: payload.properties?.value,
            currency: payload.properties?.currency,
          },
        },
        sent_at: new Date().toISOString(),
      })
      .eq('id', outboxId)

    return {
      id: outboxId,
      ok: true,
      status: 'sent',
      tiktokCode: code,
      tiktokMessage: message,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao chamar TikTok Events API'
    const status = await markRetry(outboxId, previousAttempts, message)
    return { id: outboxId, ok: false, status, message }
  }
}

export async function processTikTokOutbox(options?: {
  workspaceId?: string | null
  limit?: number
  testEventCode?: string | null
}) {
  const limit = Math.min(20, Math.max(1, Number(options?.limit || 5)))

  let query = (supabaseAdmin as any)
    .from('signal_outbox')
    .select('id,workspace_id,tracking_event_id,destination,event_name,status,attempts,next_attempt_at,created_at')
    .eq('destination', 'tiktok')
    .eq('event_name', 'purchase')
    .in('status', ['queued', 'retry'])
    .lte('next_attempt_at', new Date().toISOString())
    .order('next_attempt_at', { ascending: true })
    .limit(limit)

  if (options?.workspaceId) query = query.eq('workspace_id', options.workspaceId)

  const { data: rows, error } = await query
  if (error) throw new Error(error.message)

  const results: ProcessResult[] = []
  for (const row of rows || []) {
    results.push(await processOne(row, options?.testEventCode || null))
  }

  return {
    processed: results.length,
    sent: results.filter(r => r.status === 'sent').length,
    retry: results.filter(r => r.status === 'retry').length,
    failed: results.filter(r => r.status === 'failed').length,
    results,
  }
}
