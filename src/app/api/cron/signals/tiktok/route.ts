import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { processTikTokOutbox } from '@/lib/signals/tiktok'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function secureEqual(a: string, b: string) {
  const ah = createHash('sha256').update(a).digest()
  const bh = createHash('sha256').update(b).digest()
  return timingSafeEqual(ah, bh)
}

function authorized(req: NextRequest) {
  const expected = (process.env.CRON_SECRET || process.env.SIGNAL_WORKER_SECRET || '').trim()
  if (!expected) return false

  const auth = req.headers.get('authorization') || ''
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
  const headerToken = (req.headers.get('x-tiotrack-worker-token') || '').trim()
  const queryToken = new URL(req.url).searchParams.get('token') || ''
  const supplied = bearer || headerToken || queryToken

  return Boolean(supplied) && secureEqual(supplied, expected)
}

async function run(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const result = await processTikTokOutbox({ limit: 20 })
    return NextResponse.json({
      ok: true,
      worker: 'tiktok',
      ran_at: new Date().toISOString(),
      ...result,
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      worker: 'tiktok',
      error: error instanceof Error ? error.message : 'Falha no worker TikTok',
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return run(req)
}

export async function POST(req: NextRequest) {
  return run(req)
}
