export type QrPayloadType = 'reptile'

export interface ParsedQrPayload {
  type: QrPayloadType
  id: string
  token?: string
  source: 'payload' | 'url' | 'id'
  raw: string
}

export interface ParseQrResult {
  ok: boolean
  data?: ParsedQrPayload
  error?: 'EMPTY' | 'UNSUPPORTED_TYPE' | 'INVALID_FORMAT' | 'INVALID_ID'
}

const PAYLOAD_PREFIX = 'rm:v1:'

export function buildReptileQrPayload(id: string, token?: string): string {
  const safeId = String(id || '').trim()
  if (!safeId) return ''
  const normalizedToken = String(token || '').trim()
  if (normalizedToken) {
    return `${PAYLOAD_PREFIX}reptile:${safeId}:${normalizedToken}`
  }
  return `${PAYLOAD_PREFIX}reptile:${safeId}`
}

export function parseQrText(input: string): ParseQrResult {
  const raw = String(input || '').trim()
  if (!raw) return { ok: false, error: 'EMPTY' }

  if (raw.toLowerCase().startsWith(PAYLOAD_PREFIX)) {
    return parsePayloadText(raw)
  }

  if (/^https?:\/\//i.test(raw)) {
    return parseLegacyUrl(raw)
  }

  if (isValidId(raw)) {
    return {
      ok: true,
      data: {
        type: 'reptile',
        id: raw,
        source: 'id',
        raw,
      },
    }
  }

  return { ok: false, error: 'INVALID_FORMAT' }
}

function parsePayloadText(raw: string): ParseQrResult {
  const parts = raw.split(':')
  if (parts.length < 4) return { ok: false, error: 'INVALID_FORMAT' }

  const type = String(parts[2] || '').trim()
  const id = decodeSafe(parts[3])
  const token = decodeSafe(parts.slice(4).join(':'))

  if (type !== 'reptile') {
    return { ok: false, error: 'UNSUPPORTED_TYPE' }
  }

  if (!isValidId(id)) {
    return { ok: false, error: 'INVALID_ID' }
  }

  return {
    ok: true,
    data: {
      type: 'reptile',
      id,
      token: token || undefined,
      source: 'payload',
      raw,
    },
  }
}

function parseLegacyUrl(raw: string): ParseQrResult {
  try {
    const url = new URL(raw)
    const fromHash = extractReptileIdFromPath(url.hash.replace(/^#/, ''))
    const fromPath = extractReptileIdFromPath(url.pathname)
    const id = fromHash || fromPath

    if (!isValidId(id)) {
      return { ok: false, error: 'INVALID_FORMAT' }
    }

    return {
      ok: true,
      data: {
        type: 'reptile',
        id,
        source: 'url',
        raw,
      },
    }
  } catch {
    return { ok: false, error: 'INVALID_FORMAT' }
  }
}

function extractReptileIdFromPath(pathText: string): string {
  const m = String(pathText || '').match(/\/reptile\/([^/?#]+)/i)
  if (!m || !m[1]) return ''
  return decodeSafe(m[1])
}

function decodeSafe(value: string): string {
  const t = String(value || '').trim()
  if (!t) return ''
  try {
    return decodeURIComponent(t)
  } catch {
    return t
  }
}

function isValidId(value: string): boolean {
  const v = String(value || '').trim()
  if (!v) return false
  return /^[A-Za-z0-9_-]{4,128}$/.test(v)
}
