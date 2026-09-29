import { NextRequest, NextResponse } from 'next/server'
import { canAccessWorkspace } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { deleteCustomHostname } from '@/lib/traffic/cloudflare-saas'
import { removeDomainFromEdge, syncDomainToEdge } from '@/lib/traffic/cloudflare-kv'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(()=>({}))
  const workspaceId = String(body?.workspace_id || '')
  if (!workspaceId || !(await canAccessWorkspace(workspaceId))) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const { data: domain } = await (supabaseAdmin as any).from('traffic_domains').select('*').eq('id', id).eq('workspace_id', workspaceId).maybeSingle()
  if (!domain) return NextResponse.json({ error: 'Domínio não encontrado' }, { status: 404 })

  if (body.page_id) {
    const { data: page } = await (supabaseAdmin as any).from('traffic_pages').select('id').eq('id', String(body.page_id)).eq('workspace_id', workspaceId).maybeSingle()
    if (!page) return NextResponse.json({ error: 'Page inválida para este workspace' }, { status: 400 })
  }
  if (body.rule_id) {
    const { data: rule } = await (supabaseAdmin as any).from('traffic_rules').select('id').eq('id', String(body.rule_id)).eq('workspace_id', workspaceId).maybeSingle()
    if (!rule) return NextResponse.json({ error: 'Regra inválida para este workspace' }, { status: 400 })
  }
  const routePatch: any = {}
  if (body.origin_type === 'page' || body.origin_type === 'external') routePatch.origin_type = body.origin_type
  if ('page_id' in body) routePatch.page_id = body.page_id || null
  if ('external_origin_url' in body) routePatch.external_origin_url = body.external_origin_url || null
  if ('rule_id' in body) routePatch.rule_id = body.rule_id || null
  if ('inject_tracker' in body) routePatch.inject_tracker = body.inject_tracker !== false
  if (body.path_prefix) routePatch.path_prefix = String(body.path_prefix).startsWith('/') ? String(body.path_prefix) : `/${body.path_prefix}`
  if (Object.keys(routePatch).length) await (supabaseAdmin as any).from('traffic_routes').update({ ...routePatch, updated_at: new Date().toISOString() }).eq('domain_id', id).eq('workspace_id', workspaceId)
  if ('edge_enabled' in body || body.status) await (supabaseAdmin as any).from('traffic_domains').update({ edge_enabled: 'edge_enabled' in body ? Boolean(body.edge_enabled) : domain.edge_enabled, status: body.status || domain.status, updated_at: new Date().toISOString() }).eq('id', id)
  const edge = await syncDomainToEdge(id)
  return NextResponse.json({ ok: true, edge })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(()=>({}))
  const workspaceId = String(body?.workspace_id || '')
  if (!workspaceId || !(await canAccessWorkspace(workspaceId))) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const { data: domain } = await (supabaseAdmin as any).from('traffic_domains').select('*').eq('id', id).eq('workspace_id', workspaceId).maybeSingle()
  if (!domain) return NextResponse.json({ error: 'Domínio não encontrado' }, { status: 404 })
  if (domain.cf_custom_hostname_id) { try { await deleteCustomHostname(domain.cf_custom_hostname_id) } catch {} }
  await removeDomainFromEdge(domain.hostname)
  const { error } = await (supabaseAdmin as any).from('traffic_domains').delete().eq('id', id).eq('workspace_id', workspaceId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
