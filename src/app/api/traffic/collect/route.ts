import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { detectBrowser, detectDevice, detectOS, evaluateTraffic, type TrafficRule } from '@/lib/traffic/rule-engine'
import { randomUUID, timingSafeEqual } from 'crypto'
import { dedupKey, detectPlatform, eventId as newEventId, platformClick } from '@/lib/tracking/core'

function corsHeaders(req?: NextRequest) {
  const origin = req?.headers.get('origin')?.trim() || ''
  const allowOrigin = /^https?:\/\//i.test(origin) ? origin : '*'

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-TioTrack-Edge-Secret',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  }

  if (allowOrigin !== '*') {
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  return headers
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)


function edgeSecretMatches(req: NextRequest) {
  const expected = process.env.EDGE_LOG_SECRET
  if (!expected) return false
  const received = req.headers.get('x-tiotrack-edge-secret') || ''
  const a = Buffer.from(expected)
  const b = Buffer.from(received)
  return a.length === b.length && timingSafeEqual(a, b)
}

function edgeDecisionFrom(body: any) {
  if (body?.event_name !== 'edge_request') return null
  const metadata = body?.metadata || {}
  const action = metadata.edge_decision
  if (!['allow', 'challenge', 'block', 'redirect'].includes(action)) return null
  const riskRaw = Number(metadata.edge_risk ?? 0)
  return {
    action,
    reason: String(metadata.edge_reason || 'Decisão do Traffic Edge'),
    riskScore: Number.isFinite(riskRaw) ? Math.max(0, Math.min(100, Math.round(riskRaw))) : 0,
    matchedSignals: Array.isArray(metadata.edge_signals) ? metadata.edge_signals.map(String) : [],
  }
}

function clientIp(req: NextRequest) {
  return req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-real-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? null
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) })
}

function json(req: NextRequest, data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders(req) })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const workspaceId = String(body.workspace_id ?? '')
    if (!workspaceId) return json(req, { error: 'workspace_id obrigatório' }, 400)

    const { data: workspace } = await admin.from('workspaces').select('id').eq('id', workspaceId).maybeSingle()
    if (!workspace) return json(req, { error: 'workspace inválido' }, 404)

    const isEdgeEvent = body.event_name === 'edge_request'
    const trustedEdge = isEdgeEvent && edgeSecretMatches(req)

    if (isEdgeEvent && !trustedEdge) {
      return json(req, { error: 'assinatura do Traffic Edge inválida' }, 401)
    }

    // Edge events are sent server-to-server by the Worker. Prefer the signed
    // visitor context from the body over headers from the Worker -> Vercel hop.
    const ua = trustedEdge
      ? String(body.user_agent ?? '')
      : (req.headers.get('user-agent') ?? body.user_agent ?? '')
    const country = String(
      trustedEdge
        ? (body.country ?? '')
        : (req.headers.get('cf-ipcountry') ?? req.headers.get('x-vercel-ip-country') ?? body.country ?? '')
    ).toUpperCase() || null
    const region = trustedEdge
      ? (body.region ?? null)
      : (req.headers.get('x-vercel-ip-country-region') ?? body.region ?? null)
    const city = body.city ?? null
    const asn = body.asn ?? null
    const ip = trustedEdge ? (body.ip ?? null) : clientIp(req)
    const language = trustedEdge
      ? (body.language ?? null)
      : (body.language ?? req.headers.get('accept-language')?.split(',')[0] ?? null)

    const deviceType = detectDevice(ua)
    const os = detectOS(ua)
    const browser = detectBrowser(ua)

    const trustedEdgeDecision = trustedEdge ? edgeDecisionFrom(body) : null
    let decision = trustedEdgeDecision

    if (!decision) {
      const { data: ruleData } = await admin
        .from('traffic_rules')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('enabled', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      decision = evaluateTraffic((ruleData ?? null) as TrafficRule | null, {
        country,
        deviceType,
        os,
        userAgent: ua,
        hasSession: Boolean(body.session_id),
        hasJavascript: true,
      })
    }

    const record = {
      workspace_id: workspaceId,
      request_id: body.request_id ?? randomUUID(),
      visitor_id: body.visitor_id ?? null,
      session_id: body.session_id ?? null,
      click_id: body.click_id ?? null,
      lead_id: body.lead_id ?? null,
      product_id: body.product_id ?? null,
      funnel_id: body.funnel_id ?? null,
      step_key: body.step_key ?? null,
      canonical_event_id: body.event_id ?? null,
      event_name: body.event_name ?? 'page_view',
      path: body.path ?? null,
      landing_url: body.landing_url ?? null,
      referer: body.referer ?? null,
      ip,
      user_agent: ua || null,
      country,
      region,
      city,
      asn,
      device_type: deviceType,
      os,
      browser,
      language,
      utm_source: body.utm_source ?? null,
      utm_medium: body.utm_medium ?? null,
      utm_campaign: body.utm_campaign ?? null,
      utm_content: body.utm_content ?? null,
      utm_term: body.utm_term ?? null,
      utm_id: body.utm_id ?? null,
      fbclid: body.fbclid ?? null,
      ttclid: body.ttclid ?? null,
      gclid: body.gclid ?? null,
      action: decision.action,
      reason: decision.reason,
      risk_score: decision.riskScore,
      metadata: body.metadata ?? {},
    }

    const { error } = await (admin as any).from('traffic_events').insert(record)
    if (error) return json(req, { error: error.message }, 500)

    if (body.session_id) {
      await (admin as any).from('sessions').upsert({
        workspace_id: workspaceId,
        session_id: body.session_id,
        visitor_id: body.visitor_id ?? null,
        click_id: body.click_id ?? null,
        lead_id: body.lead_id ?? null,
        product_id: body.product_id ?? null,
        funnel_id: body.funnel_id ?? null,
        ip: record.ip,
        user_agent: record.user_agent,
        landing_url: record.landing_url,
        referer: record.referer,
        fbclid: record.fbclid,
        ttclid: record.ttclid,
        gclid: record.gclid,
        utm_source: record.utm_source,
        utm_medium: record.utm_medium,
        utm_campaign: record.utm_campaign,
        utm_content: record.utm_content,
        utm_term: record.utm_term,
        utm_id: record.utm_id,
        country: record.country,
        region: record.region,
        device_type: record.device_type,
        browser: record.browser,
        os: record.os,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,session_id' })
    }

    // Canonical tracking core V2. This is best-effort so Traffic Center remains available
    // even while a workspace is still migrating to the new tables.
    try {
      const leadId = body.lead_id ? String(body.lead_id) : null
      const trackingExtra = body?.metadata?.tiotrack?.tracking_extra || {}
      const kwclid = body?.kwclid ?? trackingExtra?.kwclid ?? null
      const kwaiClickId = body?.kwai_click_id ?? trackingExtra?.kwai_click_id ?? null
      const platform = detectPlatform({
        ttclid: record.ttclid,
        fbclid: record.fbclid,
        gclid: record.gclid,
        kwclid,
        kwai_click_id: kwaiClickId,
        utm_source: record.utm_source,
      })
      const click = platformClick({
        ttclid: record.ttclid,
        fbclid: record.fbclid,
        gclid: record.gclid,
        kwclid,
        kwai_click_id: kwaiClickId,
      })
      const touch = {
        utm_source: record.utm_source,
        utm_medium: record.utm_medium,
        utm_campaign: record.utm_campaign,
        utm_content: record.utm_content,
        utm_term: record.utm_term,
        utm_id: record.utm_id,
        ttclid: record.ttclid,
        fbclid: record.fbclid,
        gclid: record.gclid,
        kwclid,
        kwai_click_id: kwaiClickId,
        tsclid: trackingExtra?.tsclid ?? null,
        fbp: trackingExtra?._fbp ?? null,
        fbc: trackingExtra?._fbc ?? null,
        landing_url: record.landing_url,
        referer: record.referer,
        country: record.country,
        device_type: record.device_type,
        browser: record.browser,
        os: record.os,
      }

      if (leadId) {
        const { data: existingLead } = await (admin as any).from('tracking_leads')
          .select('id,first_touch,first_seen_at')
          .eq('workspace_id', workspaceId)
          .eq('lead_id', leadId)
          .maybeSingle()

        if (existingLead) {
          await (admin as any).from('tracking_leads').update({
            visitor_id: record.visitor_id,
            session_id: record.session_id,
            click_id: record.click_id,
            product_id: body.product_id ?? null,
            funnel_id: body.funnel_id ?? null,
            platform,
            click_param: click.param,
            click_value: click.value,
            last_touch: touch,
            last_seen_at: new Date().toISOString(),
          }).eq('id', existingLead.id)
        } else {
          await (admin as any).from('tracking_leads').insert({
            workspace_id: workspaceId,
            lead_id: leadId,
            visitor_id: record.visitor_id,
            session_id: record.session_id,
            click_id: record.click_id,
            product_id: body.product_id ?? null,
            funnel_id: body.funnel_id ?? null,
            platform,
            click_param: click.param,
            click_value: click.value,
            first_landing_url: record.landing_url,
            first_referer: record.referer,
            first_touch: touch,
            last_touch: touch,
          })
        }
      }

      const canonicalEventId = String(body.event_id || newEventId('web'))
      await (admin as any).from('tracking_events').insert({
        workspace_id: workspaceId,
        event_id: canonicalEventId,
        dedup_key: dedupKey([workspaceId, canonicalEventId]),
        event_name: record.event_name,
        source: body.event_name === 'edge_request' ? 'edge' : 'browser',
        lead_id: leadId,
        visitor_id: record.visitor_id,
        session_id: record.session_id,
        click_id: record.click_id,
        product_id: body.product_id ?? null,
        funnel_id: body.funnel_id ?? null,
        step_key: body.step_key ?? null,
        url: record.landing_url,
        referer: record.referer,
        utm_source: record.utm_source,
        utm_medium: record.utm_medium,
        utm_campaign: record.utm_campaign,
        utm_content: record.utm_content,
        utm_term: record.utm_term,
        utm_id: record.utm_id,
        ttclid: record.ttclid,
        fbclid: record.fbclid,
        gclid: record.gclid,
        metadata: { ...(body.metadata ?? {}), risk_score: decision.riskScore, traffic_action: decision.action },
      })
    } catch (trackingCoreError) {
      console.warn('[TioTrack] tracking core persistence skipped:', trackingCoreError)
    }

    return json(req, { ok: true, decision })
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : 'Erro interno' }, 500)
  }
}
