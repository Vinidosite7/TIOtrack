import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { inferContentType } from '@/lib/pages/content-type'
import { PAGES_BUCKET, sanitizeStaticPath } from '@/lib/pages/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function previewBase(pageId: string) {
  return `/api/pages/${encodeURIComponent(pageId)}/preview/`
}

function rewriteHtml(html: string, pageId: string) {
  const base = previewBase(pageId)
  // Keep relative assets working from the nested preview path.
  if (!/<base\s/i.test(html)) {
    html = html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}<base href="${base}">`)
  }
  // Common root-relative static assets should resolve inside the preview, not the Tiotrack app root.
  html = html.replace(/\b(src|href|poster)=(['"])\/(?!\/|api\/pages\/)/gi, (_m, attr, quote) => `${attr}=${quote}${base}`)
  html = html.replace(/\bsrcset=(['"])([^'"]+)\1/gi, (_m, quote, value) => {
    const rewritten = String(value).split(',').map((item: string) => {
      const parts = item.trim().split(/\s+/)
      if (parts[0]?.startsWith('/') && !parts[0].startsWith('//')) parts[0] = `${base}${parts[0].slice(1)}`
      return parts.join(' ')
    }).join(', ')
    return `srcset=${quote}${rewritten}${quote}`
  })
  return html
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string; path?: string[] }> }) {
  const { id, path } = await ctx.params
  const requestedPath = sanitizeStaticPath((path || []).join('/') || 'index.html')

  const { data: page, error: pageError } = await (supabaseAdmin as any)
    .from('traffic_pages')
    .select('id,status,current_deployment_id')
    .eq('id', id)
    .maybeSingle()

  if (pageError || !page || !page.current_deployment_id || page.status !== 'online') {
    return new Response('Page não encontrada ou sem deploy ativo.', { status: 404 })
  }

  const { data: dep, error: depError } = await (supabaseAdmin as any)
    .from('traffic_page_deployments')
    .select('id,storage_prefix,entry_file,status')
    .eq('id', page.current_deployment_id)
    .eq('page_id', id)
    .maybeSingle()

  if (depError || !dep || dep.status !== 'published') {
    return new Response('Deploy não encontrado.', { status: 404 })
  }

  let filePath = requestedPath
  if ((!path || path.length === 0) && dep.entry_file) filePath = sanitizeStaticPath(dep.entry_file)
  const objectPath = `${String(dep.storage_prefix).replace(/\/$/, '')}/${filePath}`

  const { data: blob, error: downloadError } = await supabaseAdmin.storage.from(PAGES_BUCKET).download(objectPath)
  if (downloadError || !blob) return new Response('Arquivo não encontrado.', { status: 404 })

  const contentType = inferContentType(filePath, blob.type || 'application/octet-stream')
  let body: BodyInit

  if (contentType.startsWith('text/html')) {
    const html = await blob.text()
    body = rewriteHtml(html, id)
  } else {
    body = await blob.arrayBuffer()
  }

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': contentType.startsWith('text/html') ? 'no-store' : 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
