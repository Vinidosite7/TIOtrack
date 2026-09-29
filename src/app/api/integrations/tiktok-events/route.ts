import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { decryptTikTokToken, encryptTikTokToken, maskToken } from '@/lib/integrations/tiktok-credentials'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function authorizeWorkspace(workspaceId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401, error: 'Não autenticado' }

  const { data: workspace, error } = await supabaseAdmin
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !workspace) return { ok: false as const, status: 403, error: 'Workspace inválido' }
  return { ok: true as const, user }
}

export async function GET(req: NextRequest) {
  const workspaceId = new URL(req.url).searchParams.get('workspace_id')?.trim()
  if (!workspaceId) return NextResponse.json({ ok: false, error: 'workspace_id obrigatório' }, { status: 400 })

  const auth = await authorizeWorkspace(workspaceId)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const { data, error } = await (supabaseAdmin as any)
    .from('tiktok_integrations')
    .select('id,name,pixel_code,advertiser_id,access_token_encrypted,enabled,last_test_status,last_test_message,last_test_at,created_at,updated_at')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ ok: true, integration: null })

  let tokenMask = '••••••••'
  try {
    tokenMask = maskToken(decryptTikTokToken(data.access_token_encrypted)) || '••••••••'
  } catch {}

  return NextResponse.json({
    ok: true,
    integration: {
      id: data.id,
      name: data.name,
      pixel_code: data.pixel_code,
      advertiser_id: data.advertiser_id,
      enabled: data.enabled,
      token_mask: tokenMask,
      last_test_status: data.last_test_status,
      last_test_message: data.last_test_message,
      last_test_at: data.last_test_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const workspaceId = String(body.workspace_id || '').trim()
  const name = String(body.name || 'TikTok Events API').trim()
  const pixelCode = String(body.pixel_code || '').trim()
  const advertiserId = String(body.advertiser_id || '').trim() || null
  const accessToken = String(body.access_token || '').trim()
  const enabled = body.enabled !== false

  if (!workspaceId) return NextResponse.json({ ok: false, error: 'workspace_id obrigatório' }, { status: 400 })
  if (!pixelCode) return NextResponse.json({ ok: false, error: 'Pixel ID obrigatório' }, { status: 400 })

  const auth = await authorizeWorkspace(workspaceId)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const { data: existing, error: readError } = await (supabaseAdmin as any)
    .from('tiktok_integrations')
    .select('id,access_token_encrypted')
    .eq('workspace_id', workspaceId)
    .eq('pixel_code', pixelCode)
    .maybeSingle()

  if (readError) return NextResponse.json({ ok: false, error: readError.message }, { status: 500 })
  if (!existing && !accessToken) {
    return NextResponse.json({ ok: false, error: 'Access Token obrigatório na primeira configuração' }, { status: 400 })
  }

  const row: Record<string, any> = {
    workspace_id: workspaceId,
    name,
    pixel_code: pixelCode,
    advertiser_id: advertiserId,
    enabled,
    updated_at: new Date().toISOString(),
  }
  if (accessToken) row.access_token_encrypted = encryptTikTokToken(accessToken)
  else row.access_token_encrypted = existing.access_token_encrypted

  let query
  if (existing?.id) {
    query = (supabaseAdmin as any).from('tiktok_integrations').update(row).eq('id', existing.id).select('id,name,pixel_code,advertiser_id,enabled,updated_at').single()
  } else {
    query = (supabaseAdmin as any).from('tiktok_integrations').insert(row).select('id,name,pixel_code,advertiser_id,enabled,updated_at').single()
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, integration: data, credential_source: 'workspace' })
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const workspaceId = String(body.workspace_id || '').trim()
  const integrationId = String(body.id || '').trim()

  if (!workspaceId || !integrationId) {
    return NextResponse.json({ ok: false, error: 'workspace_id e id obrigatórios' }, { status: 400 })
  }

  const auth = await authorizeWorkspace(workspaceId)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const { error } = await (supabaseAdmin as any)
    .from('tiktok_integrations')
    .delete()
    .eq('id', integrationId)
    .eq('workspace_id', workspaceId)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
