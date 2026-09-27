import { useEffect, useState, type ReactNode } from 'react'
import { photoRepo } from '../db/repos'
import type { Reptile } from '../db/schema'

export type PhotoRef = Pick<Reptile, 'photoId' | 'photoUrl'>

export function hasPhoto(ref: PhotoRef | undefined): boolean {
  return !!(ref?.photoId || ref?.photoUrl)
}

// Resolves a reptile's photo to a displayable src: stored photo (object URL) first, then the external URL
export function usePhotoSrc(ref: PhotoRef | undefined): { src?: string; loading: boolean } {
  const photoId = ref?.photoId
  const photoUrl = ref?.photoUrl
  const [resolved, setResolved] = useState<{ photoId: string; src?: string }>()

  useEffect(() => {
    if (!photoId) return
    let objectUrl: string | undefined
    let cancelled = false
    photoRepo.getById(photoId).then((photo) => {
      if (cancelled) return
      if (photo) objectUrl = URL.createObjectURL(photo.blob)
      setResolved({ photoId, src: objectUrl })
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photoId])

  if (!photoId) return { src: photoUrl, loading: false }
  if (resolved?.photoId !== photoId) return { loading: true }
  return { src: resolved.src ?? photoUrl, loading: false }
}

interface ReptilePhotoProps {
  photo: PhotoRef | undefined
  alt: string
  className?: string
  fallback?: ReactNode
  onClick?: () => void
}

export function ReptilePhoto({ photo, alt, className, fallback = null, onClick }: ReptilePhotoProps) {
  const { src, loading } = usePhotoSrc(photo)
  if (loading) return null
  if (!src) return <>{fallback}</>
  return <img src={src} alt={alt} className={className} onClick={onClick} />
}
