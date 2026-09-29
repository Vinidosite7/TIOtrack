import { NextRequest, NextResponse } from 'next/server'
import { canAccessWorkspace } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { removeDeployment } from '@/lib/pages/storage'
import { syncDomainToEdge } from '@/lib/traffic/cloudflare-kv'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const workspaceId = req.nextUrl.searchParams.get('workspace_id') || ''
  if (!workspaceId || !(await canAccessWorkspace(workspaceId))) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const { data: page } = await (supabaseAdmin as any).from('traffic_pages').select('*').eq('id', id).eq('workspace_id', workspaceId).maybeSingle()
  if (!page) return NextResponse.json({ error: 'Página não encontrada' }, { status: 404 })
  const { data: deployments } = await (supabaseAdmin as any).from('traffic_page_deployments').select('*').eq('page_id', id).order('version', { ascending: false })
  const current = (deployments || []).find((d: any) => d.id === page.current_deployment_id)
  const { data: files } = current ? await (supabaseAdmin as any).from('traffic_page_files').select('*').eq('deployment_id', current.id).order('path') : { data: [] }
  return NextResponse.json({ page, deployments: deployments || [], files: files || [], preview_url: current ? `/api/pages/${id}/preview/` : null })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const workspaceId = String(body?.workspace_id || '')
  if (!workspaceId || !(await canAccessWorkspace(workspaceId))) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name != null) {
    const name = String(body.name).trim().slice(0, 180)
    if (!name) return NextResponse.json({ error: 'Nome da Page é obrigatório' }, { status: 400 })
    patch.name = name
  }
  if (['draft', 'online', 'archived', 'error'].includes(body.status)) patch.status = body.status

  const { data: page, error } = await (supabaseAdmin as any)
    .from('traffic_pages')
    .update(patch)
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!page) return NextResponse.json({ error: 'Página não encontrada' }, { status: 404 })

  const { data: routes } = await (supabaseAdmin as any).from('traffic_routes').select('domain_id').eq('page_id', id)
  const domainIds = [...new Set((routes || []).map((r: any) => r.domain_id))] as string[]
  await Promise.all(domainIds.map(async domainId => { try { await syncDomainToEdge(domainId) } catch {} }))

  return NextResponse.json({ ok: true, page })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const workspaceId = String(body?.workspace_id || '')
  if (!workspaceId || !(await canAccessWorkspace(workspaceId))) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const [{ data: routes }, { data: deployments }, { data: linkedSteps }] = await Promise.all([
    (supabaseAdmin as any).from('traffic_routes').select('id,domain_id').eq('page_id', id),
    (supabaseAdmin as any).from('traffic_page_deployments').select('id,storage_prefix').eq('page_id', id).eq('workspace_id', workspaceId),
    (supabaseAdmin as any).from('funnel_steps').select('id,funnel_id').eq('page_id', id),
  ])

  // Never silently break a live route/product. The user must first select a
  // replacement presell in Produtos (or move/disable the domain route).
  if ((linkedSteps || []).length || (routes || []).length) {
    return NextResponse.json({
      error: 'Esta Page ainda está em uso. Troque a presell no Produto antes de excluir a Page.',
      code: 'PAGE_IN_USE',
      linked_steps: (linkedSteps || []).length,
      linked_routes: (routes || []).length,
    }, { status: 409 })
  }

  for (const dep of deployments || []) {
    const { data: files } = await (supabaseAdmin as any).from('traffic_page_files').select('path').eq('deployment_id', dep.id)
    try { await removeDeployment(dep.storage_prefix, (files || []).map((f:any)=>f.path)) } catch {}
  }

  const domainIds = [...new Set((routes || []).map((r: any) => r.domain_id))] as string[]
  const { error } = await (supabaseAdmin as any).from('traffic_pages').delete().eq('id', id).eq('workspace_id', workspaceId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await Promise.all(domainIds.map(async domainId => { try { await syncDomainToEdge(domainId) } catch {} }))
  return NextResponse.json({ ok: true })
}
