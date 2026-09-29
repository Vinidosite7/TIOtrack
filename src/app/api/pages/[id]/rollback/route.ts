import { NextRequest, NextResponse } from 'next/server'
import { canAccessWorkspace } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { syncDomainsUsingPage } from '@/lib/traffic/cloudflare-kv'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const workspaceId = String(body?.workspace_id || '')
  const deploymentId = String(body?.deployment_id || '')
  if (!workspaceId || !deploymentId || !(await canAccessWorkspace(workspaceId))) return NextResponse.json({ error: 'Dados inválidos ou sem acesso' }, { status: 403 })
  const { data: dep } = await (supabaseAdmin as any).from('traffic_page_deployments').select('*').eq('id', deploymentId).eq('page_id', id).eq('workspace_id', workspaceId).eq('status', 'published').maybeSingle()
  if (!dep) return NextResponse.json({ error: 'Deployment não encontrado' }, { status: 404 })
  const now = new Date().toISOString()
  const { error } = await (supabaseAdmin as any).from('traffic_pages').update({ current_deployment_id: dep.id, files_count: dep.files_count, size_bytes: dep.size_bytes, status: 'online', last_deployed_at: now, updated_at: now }).eq('id', id).eq('workspace_id', workspaceId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await syncDomainsUsingPage(id)
  return NextResponse.json({ ok: true, deployment: dep })
}
