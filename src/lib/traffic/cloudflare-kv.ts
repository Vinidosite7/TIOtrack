import type { TrafficRule } from './rule-engine'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { publicStorageBaseUrl } from '@/lib/pages/storage'

export type EdgeRulePayload = TrafficRule & {
  id?: string
  name?: string
  workspace_id: string
  updated_at?: string
  _meta: {
    schema: 2
    synced_at: string
    source: 'tiotrack-dashboard'
  }
}

export type EdgeDomainRoute = {
  id: string
  name: string
  enabled: boolean
  priority: number
  path_prefix: string
  origin_type: 'external' | 'page'
  external_origin_url?: string | null
  page_id?: string | null
  rule_id?: string | null
  inject_tracker: boolean
  page?: null | {
    storage_base_url: string
    storage_prefix: string
    entry_file: string
    deployment_id: string
    page_name?: string | null
  }
}

export type EdgeDomainPayload = {
  id: string
  hostname: string
  workspace_id: string
  enabled: boolean
  routes: EdgeDomainRoute[]
  tracker_url?: string | null
  _meta: {
    schema: 2
    synced_at: string
    source: 'tiotrack-dashboard'
  }
}

export type EdgeSyncResult = {
  status: 'synced' | 'not_configured' | 'error'
  key: string
  syncedAt?: string
  error?: string
}

export type EdgeStatusResult = {
  status: 'synced' | 'missing' | 'not_configured' | 'error'
  key: string
  rule?: EdgeRulePayload
  error?: string
}

const keyForWorkspace = (workspaceId: string) => `rule:${workspaceId}`
const keyForRule = (ruleId: string) => `rule-id:${ruleId}`
const keyForDomain = (hostname: string) => `domain:${hostname.toLowerCase()}`

function config() {
  return {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID?.trim(),
    apiToken: process.env.CLOUDFLARE_API_TOKEN?.trim(),
    namespaceId: process.env.CLOUDFLARE_TRAFFIC_KV_NAMESPACE_ID?.trim(),
  }
}

function kvValueEndpoint(key: string) {
  const c = config()
  if (!c.accountId || !c.namespaceId) return null
  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(c.accountId)}/storage/kv/namespaces/${encodeURIComponent(c.namespaceId)}/values/${encodeURIComponent(key)}`
}

async function putKv(key: string, value: unknown): Promise<EdgeSyncResult> {
  const c = config()
  const endpoint = kvValueEndpoint(key)
  if (!c.accountId || !c.apiToken || !c.namespaceId || !endpoint) {
    return { status: 'not_configured', key, error: 'Cloudflare KV ainda não configurado no ambiente do Tiotrack.' }
  }

  const syncedAt = new Date().toISOString()
  try {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${c.apiToken}`, 'Content-Type': 'application/octet-stream' },
      body: JSON.stringify(value),
      cache: 'no-store',
    })
    let body: any = null
    try { body = await response.json() } catch {}
    if (!response.ok || body?.success === false) {
      const message = body?.errors?.map((e: any) => e?.message).filter(Boolean).join('; ') || `Cloudflare respondeu HTTP ${response.status}`
      return { status: 'error', key, error: message }
    }
    return { status: 'synced', key, syncedAt }
  } catch (error) {
    return { status: 'error', key, error: error instanceof Error ? error.message : 'Falha desconhecida ao sincronizar o KV.' }
  }
}

async function deleteKv(key: string) {
  const c = config()
  const endpoint = kvValueEndpoint(key)
  if (!c.apiToken || !endpoint) return
  try { await fetch(endpoint, { method: 'DELETE', headers: { Authorization: `Bearer ${c.apiToken}` }, cache: 'no-store' }) } catch {}
}

export function isCloudflareRuleSyncConfigured() {
  const c = config()
  return Boolean(c.accountId && c.apiToken && c.namespaceId)
}

function edgeRulePayload(workspaceId: string, rule: TrafficRule & { id?: string; name?: string; updated_at?: string }): EdgeRulePayload {
  const syncedAt = new Date().toISOString()
  return {
    id: rule.id,
    name: rule.name,
    workspace_id: workspaceId,
    enabled: Boolean(rule.enabled),
    allowed_countries: rule.allowed_countries ?? [],
    allowed_devices: rule.allowed_devices ?? [],
    allowed_os: rule.allowed_os ?? [],
    blocked_user_agents: rule.blocked_user_agents ?? [],
    challenge_risk_threshold: rule.challenge_risk_threshold ?? 40,
    block_risk_threshold: rule.block_risk_threshold ?? 75,
    default_action: rule.default_action ?? 'allow',
    deny_action: rule.deny_action ?? 'block',
    redirect_url: rule.redirect_url ?? null,
    updated_at: rule.updated_at,
    _meta: { schema: 2, synced_at: syncedAt, source: 'tiotrack-dashboard' },
  }
}

async function syncRuleIdOnly(workspaceId: string, rule: TrafficRule & { id?: string; name?: string; updated_at?: string }) {
  if (!rule.id) return { status: 'error', key: 'rule-id:missing', error: 'Regra sem id.' } as EdgeSyncResult
  return putKv(keyForRule(rule.id), edgeRulePayload(workspaceId, rule))
}

export async function syncTrafficRuleToEdge(
  workspaceId: string,
  rule: TrafficRule & { id?: string; name?: string; updated_at?: string },
): Promise<EdgeSyncResult> {
  const payload = edgeRulePayload(workspaceId, rule)

  const workspaceResult = await putKv(keyForWorkspace(workspaceId), payload)
  if (workspaceResult.status !== 'synced') return workspaceResult
  if (rule.id) {
    const idResult = await putKv(keyForRule(rule.id), payload)
    if (idResult.status !== 'synced') return idResult
  }
  return workspaceResult
}

export async function syncDomainToEdge(domainId: string): Promise<EdgeSyncResult> {
  const { data: domain, error: domainError } = await (supabaseAdmin as any)
    .from('traffic_domains')
    .select('*')
    .eq('id', domainId)
    .maybeSingle()
  if (domainError || !domain) return { status: 'error', key: `domain:${domainId}`, error: domainError?.message || 'Domínio não encontrado.' }

  const { data: routes, error: routeError } = await (supabaseAdmin as any)
    .from('traffic_routes')
    .select('*')
    .eq('domain_id', domainId)
    .eq('enabled', true)
    .order('priority', { ascending: true })
  if (routeError) return { status: 'error', key: keyForDomain(domain.hostname), error: routeError.message }

  const edgeRoutes: EdgeDomainRoute[] = []
  for (const route of routes || []) {
    let page: EdgeDomainRoute['page'] = null
    if (route.origin_type === 'page' && route.page_id) {
      const { data: pageRow } = await (supabaseAdmin as any).from('traffic_pages').select('*').eq('id', route.page_id).maybeSingle()
      if (pageRow?.current_deployment_id) {
        const { data: dep } = await (supabaseAdmin as any).from('traffic_page_deployments').select('*').eq('id', pageRow.current_deployment_id).maybeSingle()
        if (dep) {
          page = {
            storage_base_url: publicStorageBaseUrl(),
            storage_prefix: dep.storage_prefix,
            entry_file: dep.entry_file || 'index.html',
            deployment_id: dep.id,
            page_name: pageRow.name || null,
          }
        }
      }
    }
    if (route.rule_id) {
      const { data: routeRule } = await (supabaseAdmin as any).from('traffic_rules').select('*').eq('id', route.rule_id).eq('workspace_id', domain.workspace_id).maybeSingle()
      if (routeRule) await syncRuleIdOnly(domain.workspace_id, routeRule as any)
    }
    edgeRoutes.push({
      id: route.id,
      name: route.name,
      enabled: route.enabled,
      priority: route.priority,
      path_prefix: route.path_prefix || '/',
      origin_type: route.origin_type,
      external_origin_url: route.external_origin_url,
      page_id: route.page_id,
      rule_id: route.rule_id,
      inject_tracker: route.inject_tracker !== false,
      page,
    })
  }

  const syncedAt = new Date().toISOString()
  const payload: EdgeDomainPayload = {
    id: domain.id,
    hostname: domain.hostname,
    workspace_id: domain.workspace_id,
    enabled: domain.status !== 'paused' && domain.status !== 'error' && domain.edge_enabled !== false,
    routes: edgeRoutes,
    tracker_url: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/tiotrack.js` : null,
    _meta: { schema: 2, synced_at: syncedAt, source: 'tiotrack-dashboard' },
  }
  const result = await putKv(keyForDomain(domain.hostname), payload)
  await (supabaseAdmin as any).from('traffic_domains').update({
    edge_synced_at: result.status === 'synced' ? syncedAt : domain.edge_synced_at,
    edge_sync_error: result.status === 'error' ? result.error : null,
    updated_at: new Date().toISOString(),
  }).eq('id', domainId)
  return result
}

export async function removeDomainFromEdge(hostname: string) {
  await deleteKv(keyForDomain(hostname))
}

export async function syncDomainsUsingPage(pageId: string) {
  const { data } = await (supabaseAdmin as any).from('traffic_routes').select('domain_id').eq('page_id', pageId)
  const ids = [...new Set((data || []).map((r: any) => r.domain_id).filter(Boolean))] as string[]
  return Promise.all(ids.map(syncDomainToEdge))
}

export async function readTrafficRuleFromEdge(workspaceId: string): Promise<EdgeStatusResult> {
  const key = keyForWorkspace(workspaceId)
  const c = config()
  const endpoint = kvValueEndpoint(key)
  if (!c.accountId || !c.apiToken || !c.namespaceId || !endpoint) return { status: 'not_configured', key, error: 'Cloudflare KV ainda não configurado.' }
  try {
    const response = await fetch(endpoint, { method: 'GET', headers: { Authorization: `Bearer ${c.apiToken}` }, cache: 'no-store' })
    if (response.status === 404) return { status: 'missing', key }
    if (!response.ok) return { status: 'error', key, error: `Cloudflare respondeu HTTP ${response.status}` }
    const raw = await response.text()
    try { return { status: 'synced', key, rule: JSON.parse(raw) as EdgeRulePayload } }
    catch { return { status: 'error', key, error: 'A regra existe no KV, mas não contém JSON válido.' } }
  } catch (error) {
    return { status: 'error', key, error: error instanceof Error ? error.message : 'Falha ao consultar o KV.' }
  }
}
