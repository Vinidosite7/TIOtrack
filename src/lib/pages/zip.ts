import { inflateRawSync } from 'node:zlib'
import { inferContentType } from './content-type'
import { sanitizeStaticPath, type UploadStaticFile } from './storage'

const EOCD_SIG = 0x06054b50
const CEN_SIG = 0x02014b50
const LOC_SIG = 0x04034b50

export type ParsedZip = {
  files: UploadStaticFile[]
  filesCount: number
  sizeBytes: number
  entryFile: string
}

function u16(b: Buffer, o: number) { return b.readUInt16LE(o) }
function u32(b: Buffer, o: number) { return b.readUInt32LE(o) }

function findEocd(buf: Buffer) {
  const start = Math.max(0, buf.length - 0xffff - 22)
  for (let i = buf.length - 22; i >= start; i--) {
    if (u32(buf, i) === EOCD_SIG) return i
  }
  return -1
}

export function parseStaticZip(input: ArrayBuffer, limits?: { maxFiles?: number; maxUncompressedBytes?: number }) : ParsedZip {
  const maxFiles = limits?.maxFiles ?? 600
  const maxUncompressedBytes = limits?.maxUncompressedBytes ?? 80 * 1024 * 1024
  const buf = Buffer.from(input)
  const eocd = findEocd(buf)
  if (eocd < 0) throw new Error('ZIP inválido ou corrompido.')

  const totalEntries = u16(buf, eocd + 10)
  const centralOffset = u32(buf, eocd + 16)
  if (totalEntries > maxFiles) throw new Error(`ZIP com arquivos demais. Máximo: ${maxFiles}.`)

  const files: UploadStaticFile[] = []
  let sizeBytes = 0
  let ptr = centralOffset

  for (let i = 0; i < totalEntries; i++) {
    if (u32(buf, ptr) !== CEN_SIG) throw new Error('Diretório central do ZIP inválido.')
    const method = u16(buf, ptr + 10)
    const compressedSize = u32(buf, ptr + 20)
    const uncompressedSize = u32(buf, ptr + 24)
    const fileNameLen = u16(buf, ptr + 28)
    const extraLen = u16(buf, ptr + 30)
    const commentLen = u16(buf, ptr + 32)
    const localOffset = u32(buf, ptr + 42)
    const rawName = buf.subarray(ptr + 46, ptr + 46 + fileNameLen).toString('utf8')
    ptr += 46 + fileNameLen + extraLen + commentLen

    if (rawName.endsWith('/')) continue
    const path = sanitizeStaticPath(rawName)
    if (!path || path.startsWith('__MACOSX/') || path.endsWith('/.DS_Store') || path === '.DS_Store') continue
    if (uncompressedSize > maxUncompressedBytes) throw new Error(`Arquivo muito grande dentro do ZIP: ${path}`)
    sizeBytes += uncompressedSize
    if (sizeBytes > maxUncompressedBytes) throw new Error(`Conteúdo extraído passa de ${Math.round(maxUncompressedBytes / 1024 / 1024)} MB.`)

    if (u32(buf, localOffset) !== LOC_SIG) throw new Error(`Entrada ZIP inválida: ${path}`)
    const localNameLen = u16(buf, localOffset + 26)
    const localExtraLen = u16(buf, localOffset + 28)
    const dataStart = localOffset + 30 + localNameLen + localExtraLen
    const compressed = buf.subarray(dataStart, dataStart + compressedSize)

    let bytes: Buffer
    if (method === 0) bytes = compressed
    else if (method === 8) bytes = inflateRawSync(compressed)
    else throw new Error(`Compressão não suportada em ${path} (método ${method}).`)

    if (bytes.length !== uncompressedSize) throw new Error(`Tamanho inválido ao extrair ${path}.`)
    files.push({ path, bytes, contentType: inferContentType(path) })
  }

  const exactIndex = files.find(f => f.path.toLowerCase() === 'index.html')?.path
  const nestedIndexes = files.filter(f => f.path.toLowerCase().endsWith('/index.html'))
  let entryFile = exactIndex || ''

  // Alguns ZIPs vêm com uma única pasta raiz. Nesse caso removemos a pasta para a página publicar em /.
  if (!entryFile && nestedIndexes.length) {
    const roots = new Set(files.map(f => f.path.split('/')[0]))
    if (roots.size === 1) {
      const root = [...roots][0]
      for (const f of files) f.path = sanitizeStaticPath(f.path.slice(root.length + 1))
      entryFile = files.find(f => f.path.toLowerCase() === 'index.html')?.path || ''
    }
  }

  if (!entryFile) throw new Error('Não encontrei index.html na raiz do ZIP.')
  return { files, filesCount: files.length, sizeBytes, entryFile }
}
