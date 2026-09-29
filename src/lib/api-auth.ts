import { createClient as createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function canAccessWorkspace(workspaceId: string) {
  if (!workspaceId) return false
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabaseAdmin.from('workspaces').select('id').eq('id', workspaceId).eq('user_id', user.id).maybeSingle()
  return Boolean(data)
}
