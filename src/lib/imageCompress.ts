const MAX_EDGE = 1280
const QUALITY = 0.82
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024
const WEB_SAFE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export interface CompressedImage {
  blob: Blob
  mimeType: string
  width: number
  height: number
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY))
}

// Resize to MAX_EDGE and re-encode as WebP (JPEG fallback when the browser can't encode WebP)
export async function compressImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) throw new Error('not_image')
  if (file.size > MAX_SOURCE_BYTES) throw new Error('too_large')

  let bitmap: ImageBitmap
  try {
    // from-image applies EXIF orientation so portrait phone photos stay upright
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('decode_failed')
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('decode_failed')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let blob = await canvasToBlob(canvas, 'image/webp')
  if (!blob || blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg')
  if (!blob) throw new Error('decode_failed')

  // Already-small images can grow when re-encoded; keep the original if it's no larger
  if (scale === 1 && file.size <= blob.size && WEB_SAFE_TYPES.has(file.type)) {
    return { blob: file, mimeType: file.type, width, height }
  }

  return { blob, mimeType: blob.type, width, height }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl)
  if (!match || !match[2]) throw new Error('invalid_data_url')
  const binary = atob(match[3])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: match[1] ?? 'application/octet-stream' })
}
