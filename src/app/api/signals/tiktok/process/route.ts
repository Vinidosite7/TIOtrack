import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { processTikTokOutbox } from '@/lib/signals/tiktok'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function secureEqual(a: string, b: string) {
  const ah = createHash('sha256').update(a).digest()
  const bh = createHash('sha256').update(b).digest()
  return timingSafeEqual(ah, bh)
}

function authorize(req: NextRequest) {
  const url = new URL(req.url)
  const supplied = url.searchParams.get('token') || req.headers.get('x-tiotrack-worker-token') || ''

  // Quick-test fallback: reuses the existing webhook secret if no dedicated
  // worker secret exists yet. Before production, set SIGNAL_WORKER_SECRET.
  const expected = (
    process.env.SIGNAL_WORKER_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SHARKBOT_WEBHOOK_SECRET ||
    ''
  ).trim()

  if (!expected) return { ok: false as const, status: 503, error: 'SIGNAL_WORKER_SECRET não configurado' }
  if (!supplied || !secureEqual(supplied, expected)) {
    return { ok: false as const, status: 401, error: 'token inválido' }
  }

  return { ok: true as const, url }
}

async function run(req: NextRequest) {
  const auth = authorize(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const workspaceId = (auth.url.searchParams.get('wid') || '').trim() || null
    const limit = Number(auth.url.searchParams.get('limit') || 5)
    const testEventCode = (auth.url.searchParams.get('test_event_code') || '').trim() || null

    const result = await processTikTokOutbox({ workspaceId, limit, testEventCode })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Erro ao processar TikTok outbox',
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return run(req)
}

export async function GET(req: NextRequest) {
  return run(req)
}
