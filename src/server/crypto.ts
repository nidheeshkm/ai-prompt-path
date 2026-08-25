import 'server-only'

// AES-256-GCM app-level encryption for provider API keys.
// ENCRYPTION_KEY env var: 64-char hex string (32 bytes).
// Generate:  openssl rand -hex 32
//
// Stored format: base64(iv):base64(ciphertext+authTag)
// IV = 12 random bytes; auth tag (16 bytes) is appended by SubtleCrypto.

function keyBytes(): ArrayBuffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate one with: openssl rand -hex 32'
    )
  }
  return new Uint8Array(hex.match(/.{2}/g)!.map(b => parseInt(b, 16))).buffer as ArrayBuffer
}

async function importKey(usage: 'encrypt' | 'decrypt'): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', keyBytes(), { name: 'AES-GCM' }, false, [usage])
}

export async function encryptApiKey(plaintext: string): Promise<string> {
  const ivBytes = new Uint8Array(12)
  crypto.getRandomValues(ivBytes)
  const iv     = ivBytes.buffer as ArrayBuffer
  const key    = await importKey('encrypt')
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  return `${Buffer.from(iv).toString('base64')}:${Buffer.from(cipher).toString('base64')}`
}

export async function decryptApiKey(stored: string): Promise<string> {
  const colon = stored.indexOf(':')
  if (colon === -1) throw new Error('Invalid encrypted key format')
  const iv         = Buffer.from(stored.slice(0, colon), 'base64').buffer as ArrayBuffer
  const ciphertext = Buffer.from(stored.slice(colon + 1), 'base64').buffer as ArrayBuffer
  const key    = await importKey('decrypt')
  const plain  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plain)
}
