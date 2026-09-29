import { NextRequest, NextResponse } from 'next/server'
import { canAccessWorkspace } from '@/lib/api-auth'
import { deployPageZip } from '@/lib/pages/publish'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const form = await req.formData()
    const workspaceId = String(form.get('workspace_id') || '')
    const zip = form.get('zip')
    if (!workspaceId || !(zip instanceof File)) return NextResponse.json({ error: 'workspace_id e zip obrigatórios' }, { status: 400 })
    if (!(await canAccessWorkspace(workspaceId))) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    const deployment = await deployPageZip(workspaceId, id, zip)
    return NextResponse.json({ deployment }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha no deploy' }, { status: 500 })
  }
}
