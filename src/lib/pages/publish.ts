import { supabaseAdmin } from '@/lib/supabase-admin'
import { uploadStaticFiles, removeDeployment } from './storage'
import { parseStaticZip } from './zip'
import { syncDomainsUsingPage } from '@/lib/traffic/cloudflare-kv'

export function pageSlug(input: string) {
  const base = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  return base || `page-${Date.now().toString(36)}`
}

async function uniqueSlug(workspaceId: string, wanted: string) {
  const base = pageSlug(wanted)
  for (let i = 0; i < 30; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`
    const { data } = await (supabaseAdmin as any).from('traffic_pages').select('id').eq('workspace_id', workspaceId).eq('slug', candidate).maybeSingle()
    if (!data) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

export async function createPageFromZip(workspaceId: string, name: string, zip: File) {
  if (!name.trim()) throw new Error('Nome da página obrigatório.')
  if (!zip || zip.size === 0) throw new Error('Selecione um arquivo ZIP.')
  if (zip.size > 35 * 1024 * 1024) throw new Error('ZIP acima de 35 MB. Reduza o arquivo antes de enviar.')
  const parsed = parseStaticZip(await zip.arrayBuffer())
  const slug = await uniqueSlug(workspaceId, name)

  const { data: page, error: pageError } = await (supabaseAdmin as any).from('traffic_pages').insert({
    workspace_id: workspaceId,
    name: name.trim().slice(0, 160),
    slug,
    status: 'draft',
  }).select('*').single()
  if (pageError || !page) throw new Error(pageError?.message || 'Falha ao criar página.')

  try {
    const storagePrefix = `workspaces/${workspaceId}/pages/${page.id}/deployments/1`
    const { data: dep, error: depError } = await (supabaseAdmin as any).from('traffic_page_deployments').insert({
      workspace_id: workspaceId,
      page_id: page.id,
      version: 1,
      storage_prefix: storagePrefix,
      entry_file: parsed.entryFile,
      status: 'uploading',
      files_count: parsed.filesCount,
      size_bytes: parsed.sizeBytes,
    }).select('*').single()
    if (depError || !dep) throw new Error(depError?.message || 'Falha ao criar deployment.')

    const uploaded = await uploadStaticFiles(storagePrefix, parsed.files)
    const fileRows = uploaded.map(f => ({
      workspace_id: workspaceId,
      page_id: page.id,
      deployment_id: dep.id,
      path: f.path,
      content_type: f.contentType,
      size_bytes: f.size,
    }))
    if (fileRows.length) {
      const { error } = await (supabaseAdmin as any).from('traffic_page_files').insert(fileRows)
      if (error) throw new Error(error.message)
    }

    await (supabaseAdmin as any).from('traffic_page_deployments').update({ status: 'published' }).eq('id', dep.id)
    const now = new Date().toISOString()
    await (supabaseAdmin as any).from('traffic_pages').update({
      current_deployment_id: dep.id,
      status: 'online',
      files_count: parsed.filesCount,
      size_bytes: parsed.sizeBytes,
      last_deployed_at: now,
      updated_at: now,
    }).eq('id', page.id)
    return { ...page, current_deployment_id: dep.id, status: 'online', files_count: parsed.filesCount, size_bytes: parsed.sizeBytes, deployment: { ...dep, status: 'published' } }
  } catch (error) {
    await (supabaseAdmin as any).from('traffic_pages').delete().eq('id', page.id)
    throw error
  }
}

export async function deployPageZip(workspaceId: string, pageId: string, zip: File) {
  if (!zip || zip.size === 0) throw new Error('Selecione um arquivo ZIP.')
  if (zip.size > 35 * 1024 * 1024) throw new Error('ZIP acima de 35 MB.')
  const parsed = parseStaticZip(await zip.arrayBuffer())
  const { data: page, error: pageError } = await (supabaseAdmin as any).from('traffic_pages').select('*').eq('id', pageId).eq('workspace_id', workspaceId).maybeSingle()
  if (pageError || !page) throw new Error('Página não encontrada.')

  const { data: latest } = await (supabaseAdmin as any).from('traffic_page_deployments').select('version').eq('page_id', pageId).order('version', { ascending: false }).limit(1).maybeSingle()
  const version = Number(latest?.version || 0) + 1
  const storagePrefix = `workspaces/${workspaceId}/pages/${pageId}/deployments/${version}`
  const { data: dep, error: depError } = await (supabaseAdmin as any).from('traffic_page_deployments').insert({
    workspace_id: workspaceId, page_id: pageId, version, storage_prefix: storagePrefix,
    entry_file: parsed.entryFile, status: 'uploading', files_count: parsed.filesCount, size_bytes: parsed.sizeBytes,
  }).select('*').single()
  if (depError || !dep) throw new Error(depError?.message || 'Falha ao criar deployment.')

  let uploaded: Array<{path:string;size:number;contentType:string|null}> = []
  try {
    uploaded = await uploadStaticFiles(storagePrefix, parsed.files)
    if (uploaded.length) {
      const { error } = await (supabaseAdmin as any).from('traffic_page_files').insert(uploaded.map(f => ({ workspace_id: workspaceId, page_id: pageId, deployment_id: dep.id, path: f.path, content_type: f.contentType, size_bytes: f.size })))
      if (error) throw new Error(error.message)
    }
    await (supabaseAdmin as any).from('traffic_page_deployments').update({ status: 'published' }).eq('id', dep.id)
    const now = new Date().toISOString()
    await (supabaseAdmin as any).from('traffic_pages').update({ current_deployment_id: dep.id, status: 'online', files_count: parsed.filesCount, size_bytes: parsed.sizeBytes, last_deployed_at: now, updated_at: now }).eq('id', pageId)
    await syncDomainsUsingPage(pageId)
    return { ...dep, status: 'published' }
  } catch (error) {
    if (uploaded.length) await removeDeployment(storagePrefix, uploaded.map(x => x.path))
    await (supabaseAdmin as any).from('traffic_page_deployments').update({ status: 'failed' }).eq('id', dep.id)
    throw error
  }
}
