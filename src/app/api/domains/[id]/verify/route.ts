import { NextRequest, NextResponse } from 'next/server'
import { canAccessWorkspace } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cloudflareSaasConfig, getCustomHostname, refreshCustomHostname, validationPayload } from '@/lib/traffic/cloudflare-saas'
import { syncDomainToEdge } from '@/lib/traffic/cloudflare-kv'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const body = await req.json().catch(()=>({}))
    const workspaceId = String(body?.workspace_id || '')
    if (!workspaceId || !(await canAccessWorkspace(workspaceId))) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    const { data: domain } = await (supabaseAdmin as any).from('traffic_domains').select('*').eq('id', id).eq('workspace_id', workspaceId).maybeSingle()
    if (!domain) return NextResponse.json({ error: 'Domínio não encontrado' }, { status: 404 })

    const cfg = cloudflareSaasConfig()
    if (!cfg.configured || !domain.cf_custom_hostname_id) {
      return NextResponse.json({ error: 'Cloudflare for SaaS ainda não está configurado para verificação automática.', cloudflare: cfg }, { status: 409 })
    }

    // Re-dispara a validação em tempo real (útil em O2O / domínio já na Cloudflare).
    await refreshCustomHostname(domain.cf_custom_hostname_id)
    const host = await getCustomHostname(domain.cf_custom_hostname_id)
    const cfStatus = host.status || 'pending'
    const sslStatus = host.ssl?.status || 'pending'
    const active = cfStatus === 'active' && sslStatus === 'active'
    const now = new Date().toISOString()
    await (supabaseAdmin as any).from('traffic_domains').update({
      cf_status: cfStatus,
      cf_ssl_status: sslStatus,
      cf_validation: validationPayload(host),
      dns_status: cfStatus === 'active' ? 'verified' : 'pending',
      ssl_status: sslStatus === 'active' ? 'active' : 'pending',
      status: active ? 'active' : 'pending',
      dns_last_checked_at: now,
      cf_error: null,
      updated_at: now,
    }).eq('id', id)
    const edge = await syncDomainToEdge(id)
    return NextResponse.json({ ok: true, active, cloudflare: host, edge })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha na verificação' }, { status: 500 })
  }
}
