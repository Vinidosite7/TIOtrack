import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function calcDailySummary(workspace_id: string, dia: string) {
  const [salesRes, spendRes, prefsRes] = await Promise.all([
    supabaseAdmin.from('conversions').select('valor,status').eq('workspace_id', workspace_id).eq('dia', dia),
    supabaseAdmin.from('ad_spend_daily').select('spend').eq('workspace_id', workspace_id).eq('dia', dia),
    supabaseAdmin.from('user_prefs').select('custo_produto').eq('workspace_id', workspace_id).single(),
  ])

  const vendas_pagas  = (salesRes.data ?? []).filter((s: any) => s.status === 'paid')
  const receita_bruta = vendas_pagas.reduce((s: number, r: any) => s + (r.valor ?? 0), 0)
  const vendas_count  = vendas_pagas.length
  const gasto_ads     = (spendRes.data ?? []).reduce((s: number, r: any) => s + (r.spend ?? 0), 0)
  const custo_pct     = prefsRes.data?.custo_produto ?? 0
  const custo_produto = receita_bruta * custo_pct
  const lucro_liquido = receita_bruta - gasto_ads - custo_produto
  const roas          = gasto_ads > 0 ? receita_bruta / gasto_ads : null
  const margem        = receita_bruta > 0 ? lucro_liquido / receita_bruta : null

  await supabaseAdmin.from('daily_summary').upsert({
    workspace_id, dia,
    receita_bruta, vendas_count, gasto_ads,
    custo_produto, lucro_liquido, roas, margem,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'workspace_id,dia' })

  return { dia, receita_bruta, gasto_ads, lucro_liquido, vendas_count }
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-cron-secret')
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await req.json().catch(() => ({}))
    const { workspace_id, dias = 30 } = body
    const { data: workspaces } = workspace_id
      ? await supabaseAdmin.from('workspaces').select('id').eq('id', workspace_id)
      : await supabaseAdmin.from('workspaces').select('id')
    let total = 0
    for (const ws of workspaces ?? []) {
      for (let i = dias - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        await calcDailySummary(ws.id, d.toISOString().split('T')[0])
        total++
      }
    }
    return NextResponse.json({ ok: true, total })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspace_id = searchParams.get('wid')
  const dias = parseInt(searchParams.get('dias') ?? '30')
  try {
    const { data: workspaces } = workspace_id
      ? await supabaseAdmin.from('workspaces').select('id').eq('id', workspace_id)
      : await supabaseAdmin.from('workspaces').select('id')
    let total = 0
    for (const ws of workspaces ?? []) {
      for (let i = dias - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        await calcDailySummary(ws.id, d.toISOString().split('T')[0])
        total++
      }
    }
    return NextResponse.json({ ok: true, total, message: `${total} dias calculados` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
