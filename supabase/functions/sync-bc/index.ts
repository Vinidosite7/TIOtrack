import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TIKTOK_API = 'https://business-api.tiktok.com/open_api/v1.3'

Deno.serve(async (req) => {
  try {
    const { bc_config_id, workspace_id } = await req.json()

    if (!bc_config_id || !workspace_id) {
      return new Response(JSON.stringify({ error: 'bc_config_id e workspace_id são obrigatórios' }), { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Busca a BC
    const { data: bc, error: bcErr } = await supabase
      .from('bc_configs')
      .select('*')
      .eq('id', bc_config_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (bcErr || !bc) {
      return new Response(JSON.stringify({ error: 'BC não encontrada' }), { status: 404 })
    }

    // Headers base para TikTok API
    const headers: Record<string, string> = {
      'Access-Token': bc.access_token,
      'Content-Type': 'application/json',
    }

    // ── 1. Busca advertiser accounts da BC ────────────────
    const advRes = await fetch(
      `${TIKTOK_API}/bc/advertiser/get/?bc_id=${bc.bc_id}&page_size=50`,
      { headers }
    )
    const advJson = await advRes.json()

    if (advJson.code !== 0) {
      await supabase.from('bc_configs').update({
        sync_status: 'error',
        sync_error:  `TikTok API: ${advJson.message}`,
        last_sync:   new Date().toISOString(),
      }).eq('id', bc_config_id)

      return new Response(JSON.stringify({ error: advJson.message }), { status: 400 })
    }

    const advertisers = advJson.data?.list ?? []

    // ── 2. Upsert advertiser accounts ─────────────────────
    for (const adv of advertisers) {
      await supabase.from('advertiser_accounts').upsert({
        bc_config_id:  bc_config_id,
        workspace_id:  workspace_id,
        advertiser_id: String(adv.advertiser_id),
        nome:          adv.name ?? null,
        status:        adv.status ?? 'ACTIVE',
      }, { onConflict: 'bc_config_id,advertiser_id' })
    }

    // ── 3. Busca saldo de cada advertiser ─────────────────
    for (const adv of advertisers) {
      const advId = String(adv.advertiser_id)

      const balRes = await fetch(
        `${TIKTOK_API}/advertiser/info/?advertiser_ids=["${advId}"]&fields=["balance","currency","status"]`,
        { headers }
      )
      const balJson = await balRes.json()
      const info = balJson.data?.list?.[0]

      if (info) {
        await supabase.from('advertiser_accounts').update({
          balance:           parseFloat(info.balance ?? '0'),
          currency:          info.currency ?? 'BRL',
          status:            info.status ?? 'ACTIVE',
          last_balance_sync: new Date().toISOString(),
        }).eq('bc_config_id', bc_config_id).eq('advertiser_id', advId)
      }

      // ── 4. Busca gasto dos últimos 30 dias por anúncio ──
      const hoje = new Date()
      const from = new Date()
      from.setDate(hoje.getDate() - 30)

      const fmt = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '')

      const reportBody = {
        advertiser_id: advId,
        report_type:   'BASIC',
        data_level:    'AUCTION_AD',
        dimensions:    ['ad_id', 'stat_time_day'],
        metrics:       ['spend', 'impressions', 'clicks', 'ctr', 'cpm', 'cpc', 'conversion', 'value_per_conversion', 'cost_per_conversion'],
        start_date:    fmt(from),
        end_date:      fmt(hoje),
        page_size:     1000,
      }

      const reportRes = await fetch(`${TIKTOK_API}/report/integrated/get/`, {
        method:  'POST',
        headers,
        body:    JSON.stringify(reportBody),
      })
      const reportJson = await reportRes.json()
      const rows = reportJson.data?.list ?? []

      for (const row of rows) {
        const dim = row.dimensions
        const met = row.metrics

        const dia = `${dim.stat_time_day.slice(0,4)}-${dim.stat_time_day.slice(4,6)}-${dim.stat_time_day.slice(6,8)}`

        await supabase.from('ad_spend_daily').upsert({
          workspace_id:        workspace_id,
          bc_config_id:        bc_config_id,
          advertiser_id:       advId,
          dia,
          ad_id:               String(dim.ad_id),
          spend:               parseFloat(met.spend ?? '0'),
          impressions:         parseInt(met.impressions ?? '0'),
          clicks:              parseInt(met.clicks ?? '0'),
          ctr:                 parseFloat(met.ctr ?? '0'),
          cpm:                 parseFloat(met.cpm ?? '0'),
          cpc:                 parseFloat(met.cpc ?? '0'),
          conversions:         parseInt(met.conversion ?? '0'),
          conversion_value:    parseFloat(met.value_per_conversion ?? '0') * parseInt(met.conversion ?? '0'),
          cost_per_conversion: parseFloat(met.cost_per_conversion ?? '0'),
        }, { onConflict: 'advertiser_id,dia,campaign_id,adgroup_id,ad_id' })
      }

      // ── 5. Busca nome dos anúncios ─────────────────────
      const adIds = [...new Set(rows.map((r: any) => String(r.dimensions.ad_id)))]

      if (adIds.length > 0) {
        const adInfoRes = await fetch(
          `${TIKTOK_API}/ad/get/?advertiser_id=${advId}&ad_ids=${JSON.stringify(adIds)}&fields=["ad_id","ad_name","campaign_id","campaign_name","adgroup_id","adgroup_name"]&page_size=100`,
          { headers }
        )
        const adInfoJson = await adInfoRes.json()
        const adList = adInfoJson.data?.list ?? []

        for (const ad of adList) {
          await supabase.from('ad_spend_daily').update({
            ad_name:       ad.ad_name ?? null,
            campaign_id:   String(ad.campaign_id ?? ''),
            campaign_name: ad.campaign_name ?? null,
            adgroup_id:    String(ad.adgroup_id ?? ''),
            adgroup_name:  ad.adgroup_name ?? null,
          })
          .eq('advertiser_id', advId)
          .eq('ad_id', String(ad.ad_id))
        }
      }
    }

    // ── 6. Atualiza status da BC ───────────────────────────
    await supabase.from('bc_configs').update({
      sync_status: 'ok',
      sync_error:  null,
      last_sync:   new Date().toISOString(),
    }).eq('id', bc_config_id)

    return new Response(JSON.stringify({
      ok: true,
      advertisers: advertisers.length,
      message: `Sync concluído: ${advertisers.length} advertiser(s) processados`,
    }), { status: 200 })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})