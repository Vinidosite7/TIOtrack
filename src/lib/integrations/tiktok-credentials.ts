import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

function getKey() {
  const raw = (process.env.TIKTOK_INTEGRATION_ENCRYPTION_KEY || '').trim()
  if (!raw) throw new Error('TIKTOK_INTEGRATION_ENCRYPTION_KEY não configurado')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('TIKTOK_INTEGRATION_ENCRYPTION_KEY precisa decodificar para 32 bytes')
  }
  return key
}

export function encryptTikTokToken(token: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.')
}

export function decryptTikTokToken(ciphertext: string) {
  const [ivB64, tagB64, dataB64] = ciphertext.split('.')
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Token criptografado inválido')
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

export function maskToken(token?: string | null) {
  if (!token) return null
  if (token.length <= 8) return '••••••••'
  return `${token.slice(0, 4)}••••••••${token.slice(-4)}`
}
