import { NextRequest, NextResponse } from 'next/server'
import { canAccessWorkspace } from '@/lib/api-auth'
import { readTrafficRuleFromEdge } from '@/lib/traffic/cloudflare-kv'

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id')?.trim() || ''
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id obrigatório' }, { status: 400 })
  if (!(await canAccessWorkspace(workspaceId))) return NextResponse.json({ error: 'Sem acesso ao workspace' }, { status: 403 })

  const edge = await readTrafficRuleFromEdge(workspaceId)
  return NextResponse.json({ ok: edge.status === 'synced', edge })
}
