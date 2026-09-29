import { NextRequest, NextResponse } from 'next/server'
import { canAccessWorkspace } from '@/lib/api-auth'
import { createPageFromZip } from '@/lib/pages/publish'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id') || ''
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id obrigatório' }, { status: 400 })
  if (!(await canAccessWorkspace(workspaceId))) return NextResponse.json({ error: 'Sem acesso ao workspace' }, { status: 403 })
  const { data: pages, error } = await (supabaseAdmin as any).from('traffic_pages').select('*').eq('workspace_id', workspaceId).order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const currentIds = (pages || []).map((p:any)=>p.current_deployment_id).filter(Boolean)
  const { data: deps } = currentIds.length ? await (supabaseAdmin as any).from('traffic_page_deployments').select('*').in('id', currentIds) : { data: [] }
  const depMap = new Map((deps || []).map((d:any)=>[d.id,d]))
  return NextResponse.json({ pages: (pages || []).map((p:any) => { const dep:any = depMap.get(p.current_deployment_id); return { ...p, current_deployment: dep || null, preview_url: dep?.storage_prefix ? `/api/pages/${p.id}/preview/` : null } }) })
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const workspaceId = String(form.get('workspace_id') || '')
    const name = String(form.get('name') || '').trim()
    const zip = form.get('zip')
    if (!workspaceId || !name || !(zip instanceof File)) return NextResponse.json({ error: 'workspace_id, name e zip são obrigatórios' }, { status: 400 })
    if (!(await canAccessWorkspace(workspaceId))) return NextResponse.json({ error: 'Sem acesso ao workspace' }, { status: 403 })
    const page = await createPageFromZip(workspaceId, name, zip)
    const dep = page.deployment
    return NextResponse.json({ page: { ...page, preview_url: `/api/pages/${page.id}/preview/` } }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao publicar página' }, { status: 500 })
  }
}
