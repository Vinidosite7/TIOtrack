import { supabaseAdmin } from '@/lib/supabase-admin'

export const PAGES_BUCKET = 'tiotrack-pages'

export type UploadStaticFile = {
  path: string
  bytes: Uint8Array
  contentType?: string | null
}

export function sanitizeStaticPath(input: string) {
  const normalized = input
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .filter(part => part && part !== '.' && part !== '..')
    .join('/')
  return normalized || 'index.html'
}

export function publicStorageBaseUrl() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (!base) throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurado')
  return `${base}/storage/v1/object/public/${PAGES_BUCKET}`
}

export function publicObjectUrl(objectPath: string) {
  return `${publicStorageBaseUrl()}/${sanitizeStaticPath(objectPath)}`
}

export async function uploadStaticFiles(prefix: string, files: UploadStaticFile[]) {
  const bucket = supabaseAdmin.storage.from(PAGES_BUCKET)
  const uploaded: { path: string; size: number; contentType: string | null }[] = []

  for (const file of files) {
    const relative = sanitizeStaticPath(file.path)
    const objectPath = `${prefix.replace(/\/$/, '')}/${relative}`
    const { error } = await bucket.upload(objectPath, file.bytes, {
      contentType: file.contentType || undefined,
      upsert: true,
      cacheControl: '31536000',
    })
    if (error) {
      if (uploaded.length) {
        const previous = uploaded.map(x => `${prefix.replace(/\/$/, '')}/${sanitizeStaticPath(x.path)}`)
        await bucket.remove(previous).catch(() => undefined)
      }
      throw new Error(`Falha ao enviar ${relative}: ${error.message}`)
    }
    uploaded.push({ path: relative, size: file.bytes.byteLength, contentType: file.contentType || null })
  }

  return uploaded
}

export async function removeDeployment(prefix: string, paths: string[]) {
  if (!paths.length) return
  const objects = paths.map(path => `${prefix.replace(/\/$/, '')}/${sanitizeStaticPath(path)}`)
  const { error } = await supabaseAdmin.storage.from(PAGES_BUCKET).remove(objects)
  if (error) throw new Error(error.message)
}
