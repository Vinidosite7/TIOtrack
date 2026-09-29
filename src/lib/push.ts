import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function sendWorkspacePush(workspaceId: string, payload: { title: string; body: string; url?: string }) {
  const { data: subs } = await admin.from('push_subscriptions').select('subscription').eq('workspace_id', workspaceId)
  if (!subs?.length) return 0
  const webpush = await import('web-push')
  webpush.default.setVapidDetails('mailto:vnmktagencia@gmail.com', process.env.NEXT_PUBLIC_VAPID_KEY!, process.env.VAPID_PRIVATE_KEY!)
  let sent = 0
  for (const sub of subs) {
    try {
      await webpush.default.sendNotification(sub.subscription, JSON.stringify({ ...payload, url: payload.url ?? '/vendas' }))
      sent++
    } catch (err: any) {
      if (err.statusCode === 410 && sub.subscription?.endpoint) {
        await admin.from('push_subscriptions').delete().eq('endpoint', sub.subscription.endpoint)
      }
    }
  }
  return sent
}
