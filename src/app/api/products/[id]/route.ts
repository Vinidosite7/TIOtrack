import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { syncDomainToEdge } from '@/lib/traffic/cloudflare-kv'


async function rebindProductPageRoutes(workspaceId: string, previousPageId: string | null, nextPageId: string) {
  const now = new Date().toISOString()
  let routes: any[] = []

  // Normal path: move every route that was serving the previous presell.
  if (previousPageId) {
    const { data } = await (supabaseAdmin as any)
      .from('traffic_routes')
      .select('id,domain_id,page_id,enabled,origin_type')
      .eq('workspace_id', workspaceId)
      .eq('page_id', previousPageId)
    routes = data || []
  }

  // Recovery path: if the old Page was already deleted, its FK becomes null and
  // the delete flow may have disabled the route. Only recover automatically when
  // there is exactly ONE orphaned page route in the workspace, so we never guess
  // between multiple domains.
  if (!routes.length) {
    const { data: orphaned } = await (supabaseAdmin as any)
      .from('traffic_routes')
      .select('id,domain_id,page_id,enabled,origin_type')
      .eq('workspace_id', workspaceId)
      .eq('origin_type', 'page')
      .eq('enabled', false)
      .is('page_id', null)

    if ((orphaned || []).length === 1) routes = orphaned || []
  }

  if (!routes.length) return { rebound: 0, synced: 0 }

  const ids = routes.map((r: any) => r.id)
  const domainIds = [...new Set(routes.map((r: any) => r.domain_id).filter(Boolean))] as string[]

  const { error } = await (supabaseAdmin as any)
    .from('traffic_routes')
    .update({
      page_id: nextPageId,
      origin_type: 'page',
      enabled: true,
      inject_tracker: true,
      updated_at: now,
    })
    .in('id', ids)

  if (error) throw new Error(error.message)

  let synced = 0
  for (const domainId of domainIds) {
    const result = await syncDomainToEdge(domainId)
    if (result.status === 'synced') synced += 1
  }

  return { rebound: ids.length, synced }
}

function priceToCents(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createServerClient()

  const { data, error } = await (supabase as any)
    .from('products')
    .select('*,funnels(*,funnel_steps(*))')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
  return NextResponse.json({ product: data })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const supabase = await createServerClient()

  const { data: current, error: currentError } = await (supabase as any)
    .from('products')
    .select('*,funnels(*,funnel_steps(*))')
    .eq('id', id)
    .maybeSingle()

  if (currentError) return NextResponse.json({ error: currentError.message }, { status: 500 })
  if (!current) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })

  const now = new Date().toISOString()
  const productPatch: Record<string, unknown> = { updated_at: now }
  if (body.name != null) {
    const name = String(body.name).trim().slice(0, 160)
    if (!name) return NextResponse.json({ error: 'Nome do produto é obrigatório' }, { status: 400 })
    productPatch.name = name
  }
  if (['draft', 'active', 'paused', 'archived'].includes(body.status)) productPatch.status = body.status
  if (Object.prototype.hasOwnProperty.call(body, 'price')) productPatch.price_cents = priceToCents(body.price)
  if (body.metadata != null) productPatch.metadata = body.metadata

  const { error: productError } = await (supabase as any)
    .from('products')
    .update(productPatch)
    .eq('id', id)

  if (productError) return NextResponse.json({ error: productError.message }, { status: 500 })

  const funnel = current.funnels?.[0]
  let routeRebind: { rebound: number; synced: number } | null = null
  if (funnel) {
    const previousPageId =
      funnel?.config?.entry?.type === 'tiotrack_page' && funnel?.config?.entry?.page_id
        ? String(funnel.config.entry.page_id)
        : null
    const config = { ...(funnel.config || {}) }
    let configChanged = false
    let nextPageId: string | null | undefined = undefined

    if (body.page_mode === 'tiotrack') {
      const pageId = String(body.page_id || '')
      if (!pageId) return NextResponse.json({ error: 'Selecione uma Page' }, { status: 400 })
      const { data: page } = await (supabase as any)
        .from('traffic_pages')
        .select('id')
        .eq('id', pageId)
        .eq('workspace_id', current.workspace_id)
        .maybeSingle()
      if (!page) return NextResponse.json({ error: 'Page inválida para este workspace' }, { status: 400 })
      config.entry = { type: 'tiotrack_page', page_id: pageId }
      nextPageId = pageId
      configChanged = true
    } else if (body.page_mode === 'external') {
      const url = String(body.page_url || '').trim()
      if (!url) return NextResponse.json({ error: 'Informe a URL externa da presell' }, { status: 400 })
      config.entry = { type: 'external_url', url }
      nextPageId = null
      configChanged = true
    }

    if (body.tracking != null) {
      config.tracking = { ...(config.tracking || {}), ...(body.tracking || {}) }
      configChanged = true
    }
    if (body.integration != null) {
      config.integration = { ...(config.integration || {}), ...(body.integration || {}) }
      configChanged = true
    }
    if (body.destination != null) {
      config.destination = { ...(config.destination || {}), ...(body.destination || {}) }
      configChanged = true
    }

    const funnelPatch: Record<string, unknown> = { updated_at: now }
    if (configChanged) funnelPatch.config = config
    if (['draft', 'active', 'paused', 'archived'].includes(body.status)) funnelPatch.status = body.status

    if (Object.keys(funnelPatch).length > 1) {
      const { error: funnelError } = await (supabase as any)
        .from('funnels')
        .update(funnelPatch)
        .eq('id', funnel.id)
        .eq('product_id', id)
      if (funnelError) return NextResponse.json({ error: funnelError.message }, { status: 500 })
    }

    if (nextPageId !== undefined) {
      const { error: stepsError } = await (supabase as any)
        .from('funnel_steps')
        .update({ page_id: nextPageId, updated_at: now })
        .eq('funnel_id', funnel.id)
        .eq('channel', 'web')
      if (stepsError) return NextResponse.json({ error: stepsError.message }, { status: 500 })

      if (nextPageId) {
        try {
          routeRebind = await rebindProductPageRoutes(current.workspace_id, previousPageId, nextPageId)
        } catch (error) {
          return NextResponse.json({
            error: error instanceof Error ? error.message : 'Falha ao religar a Page ao domínio'
          }, { status: 500 })
        }
      }
    }
  }

  const { data: updated, error: updatedError } = await (supabase as any)
    .from('products')
    .select('*,funnels(*,funnel_steps(*))')
    .eq('id', id)
    .maybeSingle()

  if (updatedError) return NextResponse.json({ error: updatedError.message }, { status: 500 })
  return NextResponse.json({ ok: true, product: updated, route_rebind: routeRebind })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createServerClient()

  const { data, error } = await (supabase as any)
    .from('products')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
