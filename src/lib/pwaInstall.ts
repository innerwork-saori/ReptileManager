import { useEffect, useState } from 'react'

export type InstallPlatform = 'installed' | 'in-app' | 'promptable' | 'ios' | 'manual'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// beforeinstallprompt fires once, early in page load, so it is captured at module import
// (see main.tsx). The default mini-infobar is left alone; this just adds our own entry point.
let deferredPrompt: BeforeInstallPromptEvent | null = null
let installedNow = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    deferredPrompt = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installedNow = true
    notify()
  })
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isIos(ua: string, platform: string, maxTouchPoints: number): boolean {
  // iPadOS reports itself as a Mac; touch support gives it away
  return /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1)
}

// In-app browsers (LINE, Facebook, Instagram, Threads, WeChat) can't install web apps
const IN_APP_UA = /\bLine\/|FBAN|FBAV|FB_IAB|Instagram|Barcelona|MicroMessenger/i

export function detectInstallPlatform(opts: {
  ua: string
  platform?: string
  maxTouchPoints?: number
  standalone: boolean
  hasPrompt: boolean
}): InstallPlatform {
  if (opts.standalone) return 'installed'
  if (IN_APP_UA.test(opts.ua)) return 'in-app'
  if (opts.hasPrompt) return 'promptable'
  if (isIos(opts.ua, opts.platform ?? '', opts.maxTouchPoints ?? 0)) return 'ios'
  return 'manual'
}

function currentPlatform(): InstallPlatform {
  return detectInstallPlatform({
    ua: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone: installedNow || isStandalone(),
    hasPrompt: deferredPrompt !== null,
  })
}

export async function promptInstall(): Promise<boolean> {
  const prompt = deferredPrompt
  if (!prompt) return false
  await prompt.prompt()
  const { outcome } = await prompt.userChoice
  // A prompt event can only be used once
  deferredPrompt = null
  notify()
  return outcome === 'accepted'
}

export function usePwaInstall(): { platform: InstallPlatform; promptInstall: typeof promptInstall } {
  const [platform, setPlatform] = useState(currentPlatform)

  useEffect(() => {
    const update = () => setPlatform(currentPlatform())
    listeners.add(update)
    const media = window.matchMedia('(display-mode: standalone)')
    media.addEventListener('change', update)
    update()
    return () => {
      listeners.delete(update)
      media.removeEventListener('change', update)
    }
  }, [])

  return { platform, promptInstall }
}
