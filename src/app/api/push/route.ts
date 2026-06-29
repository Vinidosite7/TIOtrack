import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Envia push para todos os subscribers de um workspace
export async function POST(req: NextRequest) {
  try {
    const { workspace_id, title, body, url } = await req.json()
    if (!workspace_id) return NextResponse.json({ error: 'workspace_id obrigatório' }, { status: 400 })

    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('workspace_id', workspace_id)

    if (!subs || subs.length === 0) return NextResponse.json({ ok: true, sent: 0 })

    const webpush = await import('web-push')
    webpush.default.setVapidDetails(
      'mailto:vnmktagencia@gmail.com',
      process.env.NEXT_PUBLIC_VAPID_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )

    let sent = 0
    for (const sub of subs) {
      try {
        await webpush.default.sendNotification(sub.subscription, JSON.stringify({ title, body, url: url ?? '/vendas' }))
        sent++
      } catch (err: any) {
        // Remove subscription inválida
        if (err.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('subscription', sub.subscription)
        }
      }
    }

    return NextResponse.json({ ok: true, sent })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Salva subscription
export async function PUT(req: NextRequest) {
  try {
    const { workspace_id, subscription } = await req.json()
    if (!workspace_id || !subscription) return NextResponse.json({ error: 'params obrigatórios' }, { status: 400 })

    await supabaseAdmin.from('push_subscriptions').upsert({
      workspace_id,
      subscription,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,endpoint' })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Remove subscription
export async function DELETE(req: NextRequest) {
  try {
    const { workspace_id, endpoint } = await req.json()
    await supabaseAdmin.from('push_subscriptions').delete()
      .eq('workspace_id', workspace_id).eq('endpoint', endpoint)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
