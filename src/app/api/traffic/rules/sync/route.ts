import { NextRequest, NextResponse } from 'next/server'
import { canAccessWorkspace } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { syncTrafficRuleToEdge } from '@/lib/traffic/cloudflare-kv'
import type { TrafficAction, TrafficRule } from '@/lib/traffic/rule-engine'

function asTrafficAction(value: unknown, fallback: TrafficAction): TrafficAction {
  return value === 'allow' || value === 'challenge' || value === 'block' || value === 'redirect'
    ? value
    : fallback
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const workspaceId = String(body?.workspace_id || '')
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id obrigatório' }, { status: 400 })
    if (!(await canAccessWorkspace(workspaceId))) return NextResponse.json({ error: 'Sem acesso ao workspace' }, { status: 403 })

    const { data: rule, error } = await supabaseAdmin
      .from('traffic_rules')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!rule) return NextResponse.json({ error: 'Nenhuma regra encontrada' }, { status: 404 })

    // Supabase gera default_action/deny_action como string no Database type.
    // O motor do Edge usa o union TrafficAction; normalizamos aqui antes do sync.
    const edgeRule: TrafficRule & { id?: string; name?: string; updated_at?: string } = {
      id: rule.id,
      name: rule.name,
      updated_at: rule.updated_at,
      enabled: rule.enabled,
      allowed_countries: rule.allowed_countries,
      allowed_devices: rule.allowed_devices,
      allowed_os: rule.allowed_os,
      blocked_user_agents: rule.blocked_user_agents,
      challenge_risk_threshold: rule.challenge_risk_threshold,
      block_risk_threshold: rule.block_risk_threshold,
      default_action: asTrafficAction(rule.default_action, 'allow'),
      deny_action: asTrafficAction(rule.deny_action, 'block'),
      redirect_url: rule.redirect_url,
    }

    const edge = await syncTrafficRuleToEdge(workspaceId, edgeRule)
    return NextResponse.json({ ok: edge.status !== 'error', edge })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 })
  }
}
