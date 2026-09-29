import { NextRequest, NextResponse } from 'next/server'
import { canAccessWorkspace } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cloudflareSaasConfig, createCustomHostname, validationPayload } from '@/lib/traffic/cloudflare-saas'
import { syncDomainToEdge } from '@/lib/traffic/cloudflare-kv'

function normalizeHost(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/:\d+$/, '')
}
function validHost(host: string) { return /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host) }

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id') || ''
  if (!workspaceId || !(await canAccessWorkspace(workspaceId))) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const [{ data: domains, error }, { data: pages }, { data: rules }] = await Promise.all([
    (supabaseAdmin as any).from('traffic_domains').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
    (supabaseAdmin as any).from('traffic_pages').select('id,name,status,current_deployment_id').eq('workspace_id', workspaceId).order('name'),
    (supabaseAdmin as any).from('traffic_rules').select('id,name,enabled').eq('workspace_id', workspaceId).order('name'),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const ids = (domains || []).map((d:any)=>d.id)
  const { data: routes } = ids.length ? await (supabaseAdmin as any).from('traffic_routes').select('*').in('domain_id', ids).order('priority') : { data: [] }
  const byDomain = new Map<string, any[]>()
  for (const r of routes || []) byDomain.set(r.domain_id, [...(byDomain.get(r.domain_id) || []), r])
  return NextResponse.json({
    domains: (domains || []).map((d:any)=>({ ...d, routes: byDomain.get(d.id) || [] })),
    pages: pages || [], rules: rules || [], cloudflare: cloudflareSaasConfig(),
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const workspaceId = String(body?.workspace_id || '')
    const hostname = normalizeHost(String(body?.hostname || ''))
    const originType = body?.origin_type === 'external' ? 'external' : 'page'
    const pageId = originType === 'page' ? String(body?.page_id || '') : null
    const externalUrl = originType === 'external' ? String(body?.external_origin_url || '').trim() : null
    const ruleId = body?.rule_id ? String(body.rule_id) : null
    const pathPrefix = String(body?.path_prefix || '/').trim() || '/'
    if (!workspaceId || !validHost(hostname)) return NextResponse.json({ error: 'Domínio inválido' }, { status: 400 })
    if (!(await canAccessWorkspace(workspaceId))) return NextResponse.json({ error: 'Sem acesso ao workspace' }, { status: 403 })
    if (originType === 'page' && !pageId) return NextResponse.json({ error: 'Escolha uma Page' }, { status: 400 })
    if (originType === 'page') {
      const { data: page } = await (supabaseAdmin as any).from('traffic_pages').select('id').eq('id', pageId).eq('workspace_id', workspaceId).maybeSingle()
      if (!page) return NextResponse.json({ error: 'Page inválida para este workspace' }, { status: 400 })
    }
    if (originType === 'external') { try { new URL(externalUrl || '') } catch { return NextResponse.json({ error: 'URL externa inválida' }, { status: 400 }) } }
    if (ruleId) {
      const { data: rule } = await (supabaseAdmin as any).from('traffic_rules').select('id').eq('id', ruleId).eq('workspace_id', workspaceId).maybeSingle()
      if (!rule) return NextResponse.json({ error: 'Regra inválida para este workspace' }, { status: 400 })
    }

    const cfCfg = cloudflareSaasConfig()
    const { data: domain, error: domainError } = await (supabaseAdmin as any).from('traffic_domains').insert({
      workspace_id: workspaceId, hostname, status: 'pending', dns_status: 'pending', ssl_status: 'pending',
      cname_target: cfCfg.cnameTarget, edge_enabled: true,
    }).select('*').single()
    if (domainError || !domain) return NextResponse.json({ error: domainError?.message || 'Falha ao cadastrar domínio' }, { status: 500 })

    const { data: route, error: routeError } = await (supabaseAdmin as any).from('traffic_routes').insert({
      workspace_id: workspaceId, domain_id: domain.id, name: 'Rota principal', path_prefix: pathPrefix.startsWith('/') ? pathPrefix : `/${pathPrefix}`,
      origin_type: originType, page_id: pageId, external_origin_url: externalUrl, rule_id: ruleId, inject_tracker: body?.inject_tracker !== false,
    }).select('*').single()
    if (routeError) { await (supabaseAdmin as any).from('traffic_domains').delete().eq('id', domain.id); throw new Error(routeError.message) }

    let cfWarning: string | null = null
    if (cfCfg.configured) {
      try {
        const cfHost = await createCustomHostname(hostname)
        await (supabaseAdmin as any).from('traffic_domains').update({
          cf_custom_hostname_id: cfHost.id,
          cf_status: cfHost.status || 'pending',
          cf_ssl_status: cfHost.ssl?.status || 'pending',
          cf_validation: validationPayload(cfHost),
          cf_error: null,
          updated_at: new Date().toISOString(),
        }).eq('id', domain.id)
      } catch (e) {
        cfWarning = e instanceof Error ? e.message : 'Falha ao criar Custom Hostname'
        await (supabaseAdmin as any).from('traffic_domains').update({ cf_error: cfWarning, cf_status: 'error' }).eq('id', domain.id)
      }
    }

    const edge = await syncDomainToEdge(domain.id)
    return NextResponse.json({ domain, route, edge, cloudflare_warning: cfWarning }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 })
  }
}
