import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { canAccessWorkspace } from '@/lib/api-auth'
import { sendWorkspacePush } from '@/lib/push'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function authorized(workspaceId: string) {
  return canAccessWorkspace(workspaceId)
}

export async function POST(req: NextRequest) {
  try {
    const { workspace_id, title, body, url } = await req.json()
    if (!workspace_id) return NextResponse.json({ error: 'workspace_id obrigatório' }, { status: 400 })
    if (!(await authorized(workspace_id))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const sent = await sendWorkspacePush(workspace_id, { title, body, url })
    return NextResponse.json({ ok: true, sent })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { workspace_id, subscription } = await req.json()
    if (!workspace_id || !subscription) return NextResponse.json({ error: 'params obrigatórios' }, { status: 400 })
    if (!(await authorized(workspace_id))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await admin.from('push_subscriptions').upsert({ workspace_id, endpoint: subscription.endpoint, subscription, updated_at: new Date().toISOString() }, { onConflict: 'workspace_id,endpoint' })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { workspace_id, endpoint } = await req.json()
    if (!workspace_id || !endpoint) return NextResponse.json({ error: 'params obrigatórios' }, { status: 400 })
    if (!(await authorized(workspace_id))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await admin.from('push_subscriptions').delete().eq('workspace_id', workspace_id).eq('endpoint', endpoint)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
