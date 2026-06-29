import { NextRequest, NextResponse } from 'next/server'

const TIKTOK_API = 'https://business-api.tiktok.com/open_api/v1.3'

export async function POST(req: NextRequest) {
  try {
    const { bc_id, access_token } = await req.json()

    if (!bc_id || !access_token) {
      return NextResponse.json({ error: 'bc_id e access_token são obrigatórios' }, { status: 400 })
    }

    const res = await fetch(
      `${TIKTOK_API}/bc/advertiser/get/?bc_id=${bc_id}&page_size=10`,
      { headers: { 'Access-Token': access_token, 'Content-Type': 'application/json' } }
    )

    const json = await res.json()

    if (json.code !== 0) {
      return NextResponse.json({ ok: false, message: json.message ?? 'Token ou BC ID inválido' }, { status: 200 })
    }

    const advertisers = json.data?.list ?? []
    return NextResponse.json({
      ok: true,
      advertisers: advertisers.length,
      names: advertisers.slice(0, 3).map((a: any) => a.name ?? a.advertiser_id),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
