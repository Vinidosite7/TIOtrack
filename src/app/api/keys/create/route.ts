import { NextRequest, NextResponse } from 'next/server'
import { canAccessWorkspace } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateApiKey } from '@/lib/tracking/api-keys'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const workspaceId = String(body?.workspace_id || '')
    const name = String(body?.name || 'Integration API').trim().slice(0, 120)
    const scopes = Array.isArray(body?.scopes) && body.scopes.length
      ? Array.from(new Set(body.scopes.map((s: unknown) => String(s))))
      : ['conversions:write']

    if (!workspaceId) return NextResponse.json({ error: 'workspace_id obrigatório' }, { status: 400 })
    if (!(await canAccessWorkspace(workspaceId))) return NextResponse.json({ error: 'Sem acesso ao workspace' }, { status: 403 })

    const key = generateApiKey()
    const { data, error } = await (supabaseAdmin as any)
      .from('api_keys')
      .insert({ workspace_id: workspaceId, name, key_prefix: key.prefix, secret_hash: key.hash, scopes })
      .select('id,name,key_prefix,scopes,created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, api_key: key.secret, key: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 })
  }
}
