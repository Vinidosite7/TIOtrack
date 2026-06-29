import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { workspace_id, access_token, apelido } = await req.json()
    if (!workspace_id || !access_token) return NextResponse.json({ error: 'params obrigatórios' }, { status: 400 })

    // Valida token e pega info do usuário/sistema
    const userRes  = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${access_token}`)
    const userData = await userRes.json()
    if (userData.error) return NextResponse.json({ ok: false, message: userData.error.message })

    // Busca ad accounts
    const accsRes  = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id,currency,account_status,balance&access_token=${access_token}&limit=50`)
    const accsData = await accsRes.json()
    const accounts = accsData.data ?? []

    const userId   = userData.id
    const userName = apelido ?? userData.name ?? 'Usuário do Sistema'

    // Upsert conexão
    const { data: existing } = await supabaseAdmin
      .from('meta_connections')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('fb_user_id', userId)
      .single()

    if (existing) {
      await supabaseAdmin.from('meta_connections').update({
        access_token, fb_user_name: userName, updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      await supabaseAdmin.from('meta_connections').insert({
        workspace_id, fb_user_id: userId, fb_user_name: userName, access_token, ativo: true,
      })
    }

    // Upsert ad accounts
    for (const acc of accounts) {
      await supabaseAdmin.from('meta_ad_accounts').upsert({
        workspace_id, fb_user_id: userId,
        account_id:        acc.account_id ?? acc.id.replace('act_', ''),
        account_fb_id:     acc.id,
        nome:              acc.name,
        currency:          acc.currency ?? 'BRL',
        status:            acc.account_status === 1 ? 'ACTIVE' : 'DISABLED',
        balance:           acc.balance ? parseFloat(acc.balance) / 100 : null,
        last_balance_sync: new Date().toISOString(),
      }, { onConflict: 'workspace_id,account_fb_id' })
    }

    return NextResponse.json({ ok: true, accounts: accounts.length, user: userName })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
