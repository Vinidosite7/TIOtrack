import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const META_APP_ID     = process.env.META_APP_ID!
const META_APP_SECRET = process.env.META_APP_SECRET!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const base  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tiotrack.vercel.app'

  if (error || !code || !state) {
    return NextResponse.redirect(`${base}/integracoes?meta_error=cancelled`)
  }

  try {
    const redirectUri = `${base}/api/auth/meta/callback`

    // 1. Troca code por short-lived token
    const tokenRes  = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${META_APP_SECRET}&code=${code}`)
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      return NextResponse.redirect(`${base}/integracoes?meta_error=token_failed`)
    }

    // 2. Long-lived token (60 dias)
    const llRes  = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`)
    const llData = await llRes.json()
    const token  = llData.access_token ?? tokenData.access_token

    // 3. Info do usuário
    const userRes  = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${token}`)
    const userData = await userRes.json()

    // 4. Ad Accounts
    const accsRes  = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id,currency,account_status,amount_spent,balance&access_token=${token}&limit=50`)
    const accsData = await accsRes.json()
    const accounts = accsData.data ?? []

    // 5. Upsert conexão
    const { data: existing } = await supabaseAdmin.from('meta_connections').select('id').eq('workspace_id', state).eq('fb_user_id', userData.id).single()
    if (existing) {
      await supabaseAdmin.from('meta_connections').update({ access_token: token, fb_user_name: userData.name, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabaseAdmin.from('meta_connections').insert({ workspace_id: state, fb_user_id: userData.id, fb_user_name: userData.name, access_token: token, ativo: true })
    }

    // 6. Upsert ad accounts
    for (const acc of accounts) {
      await supabaseAdmin.from('meta_ad_accounts').upsert({
        workspace_id:      state,
        fb_user_id:        userData.id,
        account_id:        acc.account_id ?? acc.id.replace('act_', ''),
        account_fb_id:     acc.id,
        nome:              acc.name,
        currency:          acc.currency ?? 'BRL',
        status:            acc.account_status === 1 ? 'ACTIVE' : 'DISABLED',
        balance:           acc.balance ? parseFloat(acc.balance) / 100 : null,
        last_balance_sync: new Date().toISOString(),
      }, { onConflict: 'workspace_id,account_fb_id' })
    }

    return NextResponse.redirect(`${base}/integracoes?meta_success=1&accounts=${accounts.length}`)
  } catch (err: any) {
    console.error('Meta OAuth error:', err)
    return NextResponse.redirect(`${base}/integracoes?meta_error=server_error`)
  }
}
