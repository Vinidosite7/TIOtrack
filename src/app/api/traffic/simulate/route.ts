import { NextRequest, NextResponse } from 'next/server'
import { evaluateTraffic } from '@/lib/traffic/rule-engine'

export async function POST(req: NextRequest) {
  try {
    const { rule, context } = await req.json()
    return NextResponse.json({ ok: true, decision: evaluateTraffic(rule, context) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Payload inválido' }, { status: 400 })
  }
}
