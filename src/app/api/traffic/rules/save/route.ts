import { NextRequest, NextResponse } from 'next/server'
import { canAccessWorkspace } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { syncTrafficRuleToEdge } from '@/lib/traffic/cloudflare-kv'
import type { TrafficAction, TrafficRule } from '@/lib/traffic/rule-engine'

const ACTIONS = new Set<TrafficAction>(['allow', 'challenge', 'block', 'redirect'])
const DENY_ACTIONS = new Set<TrafficAction>(['challenge', 'block', 'redirect'])

function cleanList(value: unknown, upper = false) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value
    .map(v => String(v ?? '').trim())
    .filter(Boolean)
    .map(v => upper ? v.toUpperCase() : v.toLowerCase())))
}

function clampScore(value: unknown, fallback: number) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.min(100, Math.round(n)))
}

function cleanRule(input: any): TrafficRule & { id?: string; name: string } {
  const challenge = clampScore(input?.challenge_risk_threshold, 40)
  const block = Math.max(challenge, clampScore(input?.block_risk_threshold, 75))
  const defaultAction = ACTIONS.has(input?.default_action) ? input.default_action : 'allow'
  const denyAction = DENY_ACTIONS.has(input?.deny_action) ? input.deny_action : 'block'
  const redirectUrl = typeof input?.redirect_url === 'string' && input.redirect_url.trim()
    ? input.redirect_url.trim()
    : null

  return {
    id: typeof input?.id === 'string' ? input.id : undefined,
    name: String(input?.name || 'Regra principal').trim().slice(0, 120) || 'Regra principal',
    enabled: Boolean(input?.enabled),
    allowed_countries: cleanList(input?.allowed_countries, true),
    allowed_devices: cleanList(input?.allowed_devices),
    allowed_os: cleanList(input?.allowed_os),
    blocked_user_agents: cleanList(input?.blocked_user_agents),
    challenge_risk_threshold: challenge,
    block_risk_threshold: block,
    default_action: defaultAction,
    deny_action: denyAction,
    redirect_url: denyAction === 'redirect' ? redirectUrl : null,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const workspaceId = String(body?.workspace_id || '')
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id obrigatório' }, { status: 400 })
    if (!(await canAccessWorkspace(workspaceId))) return NextResponse.json({ error: 'Sem acesso ao workspace' }, { status: 403 })

    const rule = cleanRule(body?.rule)
    const updatedAt = new Date().toISOString()
    const dbPayload = {
      name: rule.name,
      enabled: rule.enabled ?? true,
      allowed_countries: rule.allowed_countries ?? [],
      allowed_devices: rule.allowed_devices ?? [],
      allowed_os: rule.allowed_os ?? [],
      blocked_user_agents: rule.blocked_user_agents ?? [],
      challenge_risk_threshold: rule.challenge_risk_threshold ?? 40,
      block_risk_threshold: rule.block_risk_threshold ?? 75,
      default_action: rule.default_action ?? 'allow',
      deny_action: rule.deny_action ?? 'block',
      redirect_url: rule.redirect_url ?? null,
      updated_at: updatedAt,
    }

    let existingId = rule.id
    if (existingId) {
      const { data } = await supabaseAdmin
        .from('traffic_rules')
        .select('id')
        .eq('id', existingId)
        .eq('workspace_id', workspaceId)
        .maybeSingle()
      if (!data) existingId = undefined
    }

    if (!existingId) {
      const { data } = await supabaseAdmin
        .from('traffic_rules')
        .select('id')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      existingId = data?.id
    }

    let saved: any
    if (existingId) {
      const { data, error } = await supabaseAdmin
        .from('traffic_rules')
        .update(dbPayload)
        .eq('id', existingId)
        .eq('workspace_id', workspaceId)
        .select('*')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      saved = data
    } else {
      const { data, error } = await supabaseAdmin
        .from('traffic_rules')
        .insert({ workspace_id: workspaceId, ...dbPayload })
        .select('*')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      saved = data
    }

    const edge = await syncTrafficRuleToEdge(workspaceId, saved)
    return NextResponse.json({ ok: true, rule: saved, edge })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 })
  }
}
