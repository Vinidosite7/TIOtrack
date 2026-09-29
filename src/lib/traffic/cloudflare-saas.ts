type CfEnvelope<T> = {
  success: boolean
  result: T
  errors?: Array<{ code?: number; message?: string }>
}

export type CfCustomHostname = {
  id: string
  hostname: string
  status?: string
  ownership_verification?: { type?: string; name?: string; value?: string }
  ssl?: {
    status?: string
    validation_records?: Array<{
      status?: string
      txt_name?: string
      txt_value?: string
      cname?: string
      cname_target?: string
      http_url?: string
      http_body?: string
    }>
  }
  verification_errors?: string[]
}

function cfg() {
  return {
    token: process.env.CLOUDFLARE_API_TOKEN?.trim(),
    zoneId: process.env.CLOUDFLARE_SAAS_ZONE_ID?.trim(),
    cnameTarget: process.env.TIO_EDGE_CNAME_TARGET?.trim(),
  }
}

export function cloudflareSaasConfig() {
  const c = cfg()
  return {
    configured: Boolean(c.token && c.zoneId),
    cnameTarget: c.cnameTarget || null,
  }
}

async function cf<T>(path: string, init?: RequestInit): Promise<T> {
  const c = cfg()
  if (!c.token || !c.zoneId) throw new Error('Cloudflare for SaaS não configurado no ambiente.')
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(c.zoneId)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${c.token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
  const body = await res.json() as CfEnvelope<T>
  if (!res.ok || !body?.success) {
    const msg = body?.errors?.map(e => e?.message).filter(Boolean).join('; ') || `Cloudflare HTTP ${res.status}`
    throw new Error(msg)
  }
  return body.result
}

export async function createCustomHostname(hostname: string) {
  return cf<CfCustomHostname>('/custom_hostnames', {
    method: 'POST',
    body: JSON.stringify({ hostname, ssl: { method: 'http', type: 'dv' } }),
  })
}


export async function refreshCustomHostname(id: string) {
  return cf<CfCustomHostname>(`/custom_hostnames/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ ssl: { method: 'http', type: 'dv' } }),
  })
}

export async function getCustomHostname(id: string) {
  return cf<CfCustomHostname>(`/custom_hostnames/${encodeURIComponent(id)}`)
}

export async function deleteCustomHostname(id: string) {
  return cf<any>(`/custom_hostnames/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function validationPayload(host: CfCustomHostname) {
  return {
    ownership_verification: host.ownership_verification || null,
    ssl_validation_records: host.ssl?.validation_records || [],
    verification_errors: host.verification_errors || [],
  }
}
