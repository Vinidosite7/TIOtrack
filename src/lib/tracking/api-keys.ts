import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

export function hashApiKey(secret: string) {
  return createHash('sha256').update(secret).digest('hex')
}

export function generateApiKey() {
  const secret = `tio_live_${randomBytes(32).toString('base64url')}`
  return {
    secret,
    prefix: secret.slice(0, 16),
    hash: hashApiKey(secret),
  }
}

export async function verifyApiKey(secret: string, requiredScope: string) {
  if (!secret || !secret.startsWith('tio_')) return null
  const hash = hashApiKey(secret)
  const { data } = await (supabaseAdmin as any)
    .from('api_keys')
    .select('id,workspace_id,secret_hash,scopes,revoked_at')
    .eq('secret_hash', hash)
    .maybeSingle()
  if (!data || data.revoked_at) return null
  const expected = Buffer.from(data.secret_hash)
  const received = Buffer.from(hash)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null
  if (!Array.isArray(data.scopes) || !data.scopes.includes(requiredScope)) return null
  await (supabaseAdmin as any).from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
  return { id: data.id as string, workspaceId: data.workspace_id as string, scopes: data.scopes as string[] }
}
