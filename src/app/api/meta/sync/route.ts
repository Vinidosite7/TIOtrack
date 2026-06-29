import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { workspace_id, fb_user_id } = await req.json()
    if (!workspace_id || !fb_user_id) return NextResponse.json({ error: 'params obrigatórios' }, { status: 400 })

    const { data: conn } = await supabaseAdmin
      .from('meta_connections')
      .select('access_token')
      .eq('workspace_id', workspace_id)
      .eq('fb_user_id', fb_user_id)
      .single()

    if (!conn) return NextResponse.json({ error: 'conexão não encontrada' }, { status: 404 })

    const token = conn.access_token
    const { data: accounts } = await supabaseAdmin
      .from('meta_ad_accounts')
      .select('account_fb_id, account_id, nome')
      .eq('workspace_id', workspace_id)
      .eq('fb_user_id', fb_user_id)

    const since = new Date()
    since.setDate(since.getDate() - 30)
    const sinceStr = since.toISOString().split('T')[0]
    const untilStr = new Date().toISOString().split('T')[0]

    let synced = 0
    let totalRows = 0
    const errors: string[] = []

    for (const acc of accounts ?? []) {
      try {
        // 1. Atualiza saldo
        const balRes  = await fetch(`https://graph.facebook.com/v19.0/${acc.account_fb_id}?fields=balance,amount_spent,account_status&access_token=${token}`)
        const balData = await balRes.json()
        if (!balData.error) {
          await supabaseAdmin.from('meta_ad_accounts').update({
            balance:           balData.balance ? parseFloat(balData.balance) / 100 : null,
            status:            balData.account_status === 1 ? 'ACTIVE' : 'DISABLED',
            last_balance_sync: new Date().toISOString(),
          }).eq('account_fb_id', acc.account_fb_id).eq('workspace_id', workspace_id)
        }

        // 2. Insights por campanha (mais simples e confiável)
        const url = `https://graph.facebook.com/v19.0/${acc.account_fb_id}/insights?` +
          `fields=campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,actions,action_values,impressions,clicks,ctr,cpm,cpc` +
          `&time_range={"since":"${sinceStr}","until":"${untilStr}"}` +
          `&level=ad&time_increment=1&limit=500` +
          `&access_token=${token}`

        const insRes  = await fetch(url)
        const insData = await insRes.json()

        if (insData.error) {
          errors.push(`${acc.nome}: ${insData.error.message}`)
          continue
        }

        const rows = insData.data ?? []

        for (const row of rows) {
          const conversions    = row.actions?.find((a: any) => a.action_type === 'purchase')?.value ?? 0
          const conversion_val = row.action_values?.find((a: any) => a.action_type === 'purchase')?.value ?? 0

          await supabaseAdmin.from('meta_ad_spend_daily').upsert({
            workspace_id,
            account_fb_id:    acc.account_fb_id,
            dia:              row.date_start,
            campaign_id:      row.campaign_id ?? null,
            campaign_name:    row.campaign_name ?? null,
            adset_id:         row.adset_id ?? null,
            adset_name:       row.adset_name ?? null,
            ad_id:            row.ad_id ?? null,
            ad_name:          row.ad_name ?? null,
            spend:            parseFloat(row.spend ?? '0'),
            conversion_value: parseFloat(conversion_val),
            conversions:      parseInt(conversions),
            impressions:      parseInt(row.impressions ?? '0'),
            clicks:           parseInt(row.clicks ?? '0'),
            ctr:              parseFloat(row.ctr ?? '0'),
            cpm:              parseFloat(row.cpm ?? '0'),
            cpc:              parseFloat(row.cpc ?? '0'),
          }, { onConflict: 'workspace_id,account_fb_id,dia,ad_id' })

          totalRows++
        }

        synced++
      } catch (err: any) {
        errors.push(`${acc.nome}: ${err.message}`)
      }
    }

    return NextResponse.json({ ok: true, synced, totalRows, errors: errors.length > 0 ? errors : undefined })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── GET: teste de token ────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token obrigatório' }, { status: 400 })

  try {
    const userRes  = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${token}`)
    const userData = await userRes.json()
    if (userData.error) return NextResponse.json({ ok: false, message: userData.error.message })

    const accsRes  = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id&access_token=${token}&limit=50`)
    const accsData = await accsRes.json()
    const accounts = accsData.data ?? []

    return NextResponse.json({ ok: true, user: userData.name, accounts: accounts.length, names: accounts.slice(0,3).map((a: any) => a.name) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
