import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { workspace_id, fb_user_id } = await req.json()
  await supabaseAdmin.from('meta_connections').delete().eq('workspace_id', workspace_id).eq('fb_user_id', fb_user_id)
  await supabaseAdmin.from('meta_ad_accounts').delete().eq('workspace_id', workspace_id).eq('fb_user_id', fb_user_id)
  return NextResponse.json({ ok: true })
}
