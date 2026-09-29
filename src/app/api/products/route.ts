import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { defaultSteps, isFunnelType, slugify } from '@/lib/tracking/funnels'

function cents(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id') || ''
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id obrigatório' }, { status: 400 })

  // Uses the signed-in user's Supabase session. RLS validates workspace ownership,
  // avoiding extra auth + ownership round-trips before the actual query.
  const supabase = await createServerClient()
  const { data, error } = await (supabase as any)
    .from('products')
    .select('*,funnels(*,funnel_steps(*))')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: data || [] })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const workspaceId = String(body?.workspace_id || '')
    const name = String(body?.name || '').trim().slice(0, 160)
    const funnelType = body?.funnel_type

    if (!workspaceId || !name || !isFunnelType(funnelType)) {
      return NextResponse.json({ error: 'workspace_id, name e funnel_type válidos são obrigatórios' }, { status: 400 })
    }

    const pageId = body?.page_id ? String(body.page_id) : null
    if (pageId) {
      const supabaseCheck = await createServerClient()
      const { data: page } = await (supabaseCheck as any).from('traffic_pages').select('id').eq('id', pageId).eq('workspace_id', workspaceId).maybeSingle()
      if (!page) return NextResponse.json({ error: 'Page inválida para este workspace' }, { status: 400 })
    }

    const funnelConfig = {
      entry: body?.entry || {},
      destination: body?.destination || {},
      integration: body?.integration || {},
      tracking: body?.tracking || {},
      traffic_rule_id: body?.traffic_rule_id || null,
    }

    // Build the step templates in the API, but persist product + funnel + all steps
    // atomically with one RPC/database round-trip.
    const stepSeeds = defaultSteps(funnelType).map(step => ({
      ...step,
      page_id: step.channel === 'web' ? pageId : null,
      config: step.step_key === 'telegram_start'
        ? { provider: body?.integration?.telegram_provider || null, bot_id: body?.integration?.bot_id || null }
        : step.step_key === 'whatsapp_start'
          ? { phone: body?.integration?.whatsapp_phone || null }
          : {},
    }))

    const supabase = await createServerClient()
    const { data, error } = await (supabase as any).rpc('tio_create_product_bundle', {
      p_workspace_id: workspaceId,
      p_name: name,
      p_base_slug: slugify(name),
      p_status: body?.status === 'draft' ? 'draft' : 'active',
      p_price_cents: cents(body?.price),
      p_currency: String(body?.currency || 'BRL').toUpperCase().slice(0, 8),
      p_product_metadata: body?.product_metadata || {},
      p_funnel_name: String(body?.funnel_name || `${name} · Principal`).slice(0, 180),
      p_funnel_type: funnelType,
      p_funnel_config: funnelConfig,
      p_steps: stepSeeds,
    })

    if (error) {
      const forbidden = /não autenticado|sem acesso/i.test(error.message || '')
      return NextResponse.json({ error: error.message }, { status: forbidden ? 403 : 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 })
  }
}
