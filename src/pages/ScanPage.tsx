import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import { Camera, CameraOff, Keyboard, RefreshCcw, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { reptileRepo } from '../db/repos'
import { parseQrText } from '../lib/qrPayload'

type ScanStatus = 'idle' | 'starting' | 'ready' | 'stopped'
type ScanError =
  | 'permission_denied'
  | 'device_not_found'
  | 'camera_unavailable'
  | 'api_unavailable'
  | 'invalid_code'
  | 'not_found'
  | null

const wait = (ms: number) => new Promise<void>((resolve) => {
  window.setTimeout(() => resolve(), ms)
})

export function ScanPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [status, setStatus] = useState<ScanStatus>('idle')
  const [error, setError] = useState<ScanError>(null)
  const [message, setMessage] = useState('')
  const [manualInput, setManualInput] = useState('')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const hideCleanupTimerRef = useRef<number | null>(null)
  const autoRetryTimerRef = useRef<number | null>(null)
  const handlingResultRef = useRef(false)
  const isStartingRef = useRef(false)
  const hasAutoRetriedRef = useRef(false)

  const isIosStandalone = useMemo(() => {
    const ua = navigator.userAgent
    const isIosDevice = /iPad|iPhone|iPod/.test(ua)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const standaloneByDisplayMode = window.matchMedia('(display-mode: standalone)').matches
    const standaloneByNavigator = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    return isIosDevice && (standaloneByDisplayMode || standaloneByNavigator)
  }, [])

  const cleanupStream = useCallback(() => {
    if (hideCleanupTimerRef.current != null) {
      window.clearTimeout(hideCleanupTimerRef.current)
      hideCleanupTimerRef.current = null
    }

    if (autoRetryTimerRef.current != null) {
      window.clearTimeout(autoRetryTimerRef.current)
      autoRetryTimerRef.current = null
    }

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop()
      }
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const handleParsedText = useCallback(async (text: string) => {
    if (handlingResultRef.current) return
    handlingResultRef.current = true

    const parsed = parseQrText(text)
    if (!parsed.ok || !parsed.data) {
      setError('invalid_code')
      setMessage(t('scan.invalidCode'))
      handlingResultRef.current = false
      return
    }

    if (parsed.data.type === 'reptile') {
      const reptile = await reptileRepo.getById(parsed.data.id)
      if (!reptile) {
        setError('not_found')
        setMessage(t('scan.notFound'))
        handlingResultRef.current = false
        return
      }

      cleanupStream()
      setStatus('stopped')
      navigate(`/reptile/${reptile.id}`)
      return
    }

    setError('invalid_code')
    setMessage(t('scan.unsupportedType'))
    handlingResultRef.current = false
  }, [cleanupStream, navigate, t])

  const scanFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) {
      rafRef.current = requestAnimationFrame(scanFrame)
      return
    }

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame)
      return
    }

    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) {
      rafRef.current = requestAnimationFrame(scanFrame)
      return
    }

    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      rafRef.current = requestAnimationFrame(scanFrame)
      return
    }

    ctx.drawImage(video, 0, 0, width, height)
    const imageData = ctx.getImageData(0, 0, width, height)
    const result = jsQR(imageData.data, width, height)

    if (result?.data) {
      void handleParsedText(result.data)
    }

    rafRef.current = requestAnimationFrame(scanFrame)
  }, [handleParsedText])

  const warmupCameraPermission = useCallback(async () => {
    const warmupStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    })

    for (const track of warmupStream.getTracks()) {
      track.stop()
    }
  }, [])

  const startScanner = useCallback(async (options?: { isAutoRetry?: boolean }) => {
    const isAutoRetry = options?.isAutoRetry === true

    if (!isAutoRetry) {
      hasAutoRetriedRef.current = false
      if (autoRetryTimerRef.current != null) {
        window.clearTimeout(autoRetryTimerRef.current)
        autoRetryTimerRef.current = null
      }
    }

    if (isStartingRef.current) return

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('api_unavailable')
      setMessage(t('scan.apiUnavailable'))
      return
    }

    isStartingRef.current = true
    cleanupStream()
    handlingResultRef.current = false
    setMessage('')
    setError(null)
    setStatus('starting')

    try {
      if (!isAutoRetry) {
        await warmupCameraPermission()
        await wait(500)
      }

      let stream: MediaStream | null = null
      const attempts: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        { video: true, audio: false },
      ]

      for (const constraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints)
          break
        } catch (err) {
          if (!(err instanceof DOMException)) throw err
          if (err.name === 'NotAllowedError') throw err
        }
      }

      if (!stream) {
        throw new DOMException('camera stream unavailable', 'NotReadableError')
      }

      streamRef.current = stream
      const video = videoRef.current
      if (!video) {
        throw new DOMException('video element not ready', 'AbortError')
      }

      video.muted = true
      video.playsInline = true
      video.setAttribute('playsinline', 'true')
      video.setAttribute('webkit-playsinline', 'true')
      video.srcObject = stream
      await video.play()

      if (isIosStandalone) {
        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 280)
        })

        const hasFrames = video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
          && video.videoWidth > 0
          && video.videoHeight > 0
        if (!hasFrames) {
          throw new DOMException('camera stream has no frames', 'AbortError')
        }
      }

      setStatus('ready')
      rafRef.current = requestAnimationFrame(scanFrame)
    } catch (err) {
      cleanupStream()
      setStatus('idle')

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('permission_denied')
          setMessage(t('scan.permissionDenied'))
          return
        }
        if (err.name === 'NotFoundError') {
          setError('device_not_found')
          setMessage(t('scan.noCamera'))
          return
        }
      }

      if (isIosStandalone && !isAutoRetry && !hasAutoRetriedRef.current) {
        hasAutoRetriedRef.current = true
        autoRetryTimerRef.current = window.setTimeout(() => {
          autoRetryTimerRef.current = null
          void startScanner({ isAutoRetry: true })
        }, 450)
        return
      }

      setError('camera_unavailable')
      setMessage(t('scan.cameraBusy'))
    } finally {
      isStartingRef.current = false
    }
  }, [cleanupStream, isIosStandalone, scanFrame, t, warmupCameraPermission])

  const stopScanner = useCallback(() => {
    cleanupStream()
    setStatus('stopped')
  }, [cleanupStream])

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError(null)
    await handleParsedText(manualInput)
  }

  useEffect(() => {
    return () => cleanupStream()
  }, [cleanupStream])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (hideCleanupTimerRef.current != null) {
          window.clearTimeout(hideCleanupTimerRef.current)
        }

        // iOS standalone PWA may briefly flip to hidden while permission sheet is shown.
        // Delay cleanup so transient visibility changes do not kill a freshly-started stream.
        hideCleanupTimerRef.current = window.setTimeout(() => {
          hideCleanupTimerRef.current = null
          if (document.visibilityState === 'hidden' && status === 'ready') {
            cleanupStream()
            setStatus('stopped')
          }
        }, 1200)
        return
      }

      if (hideCleanupTimerRef.current != null) {
        window.clearTimeout(hideCleanupTimerRef.current)
        hideCleanupTimerRef.current = null
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [cleanupStream, status])

  const statusText = useMemo(() => {
    if (status === 'ready') return t('scan.statusReady')
    if (status === 'starting') return t('scan.statusStarting')
    if (status === 'stopped') return t('scan.statusStopped')
    return t('scan.statusIdle')
  }, [status, t])

  return (
    <Layout title={t('scan.title')} back="/">
      <div className="px-4 pt-5 pb-28 max-w-lg mx-auto space-y-4">
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 space-y-2">
          <h2 className="text-base font-semibold text-primary">{t('scan.cameraSectionTitle')}</h2>
          <p className="text-sm text-on-surface-variant">{t('scan.cameraSectionHint')}</p>
          <div className="text-xs text-on-surface-variant">{statusText}</div>
        </section>

        <section className="bg-black rounded-xl overflow-hidden border border-outline-variant relative">
          <video
            ref={videoRef}
            className="w-full aspect-[4/3] object-cover"
            muted
            playsInline
            autoPlay
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-52 h-52 border-2 border-white/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(status === 'idle' || status === 'stopped') && (
            <button
              onClick={() => void startScanner()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-on-primary py-3 font-semibold"
            >
              <Camera size={18} />
              {t('scan.startCamera')}
            </button>
          )}

          {status === 'ready' && (
            <button
              onClick={stopScanner}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-surface-container-high text-on-surface py-3 font-semibold border border-outline-variant"
            >
              <CameraOff size={18} />
              {t('scan.stopCamera')}
            </button>
          )}

          <button
            onClick={() => void startScanner()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-secondary text-white py-3 font-semibold"
          >
            <RefreshCcw size={18} />
            {t('scan.retryCamera')}
          </button>
        </section>

        {error && (
          <section className="rounded-xl border border-red-300 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
              <TriangleAlert size={16} />
              {t('scan.errorTitle')}
            </div>
            <p className="text-sm text-red-700 mt-1">{message}</p>
            {error === 'permission_denied' && (
              <p className="text-xs text-red-700/90 mt-2">{t('scan.permissionGuide')}</p>
            )}
          </section>
        )}

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
          <form onSubmit={(e) => void handleManualSubmit(e)} className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Keyboard size={16} />
              <h3 className="text-sm font-semibold">{t('scan.manualTitle')}</h3>
            </div>
            <textarea
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={t('scan.manualPlaceholder')}
              rows={3}
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-primary-container text-on-primary-container py-2.5 font-semibold"
            >
              {t('scan.manualSubmit')}
            </button>
          </form>
        </section>
      </div>
    </Layout>
  )
}
