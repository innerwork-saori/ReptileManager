import { useEffect, useRef, useState } from 'react'
import { Check, CircleCheck, Copy, Globe, MonitorDown, Share, SquarePlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePwaInstall } from '../lib/pwaInstall'

const APP_URL = typeof window !== 'undefined' ? `${window.location.origin}/` : '/'

function CopyLinkButton() {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current)
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(APP_URL)
      setCopied(true)
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Some in-app browsers block the clipboard; the URL stays visible for manual copying
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary active:scale-[0.98] transition-transform"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? t('install.copied') : t('install.copyLink')}
    </button>
  )
}

export function InstallAppCard() {
  const { t } = useTranslation()
  const { platform, promptInstall } = usePwaInstall()

  if (platform === 'installed') {
    return (
      <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant p-4 rounded-xl shadow-sm">
        <CircleCheck size={20} className="text-primary shrink-0" />
        <div>
          <p className="text-sm font-semibold text-on-surface">{t('install.installed')}</p>
          <p className="text-xs text-on-surface-variant">{t('install.installedHint')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl shadow-sm space-y-3">
      <p className="text-sm leading-relaxed text-on-surface-variant">{t('install.why')}</p>

      {platform === 'promptable' && (
        <button
          type="button"
          onClick={() => void promptInstall()}
          className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-3 rounded-xl text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          <MonitorDown size={18} />
          {t('install.installBtn')}
        </button>
      )}

      {platform === 'ios' && (
        <ol className="space-y-2">
          {[
            { Icon: Share, text: t('install.iosStep1') },
            { Icon: SquarePlus, text: t('install.iosStep2') },
          ].map(({ Icon, text }, i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg bg-surface-container p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
                {i + 1}
              </span>
              <Icon size={18} className="shrink-0 text-primary" />
              <span className="text-sm text-on-surface">{text}</span>
            </li>
          ))}
        </ol>
      )}

      {platform === 'in-app' && (
        <div className="space-y-2 rounded-lg bg-surface-container p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-secondary">
            <Globe size={16} />
            {t('install.inAppTitle')}
          </p>
          <p className="text-sm leading-relaxed text-on-surface">{t('install.inAppBody')}</p>
          <p className="select-all break-all text-xs text-on-surface-variant">{APP_URL}</p>
          <CopyLinkButton />
        </div>
      )}

      {platform === 'manual' && (
        <p className="rounded-lg bg-surface-container p-3 text-sm text-on-surface">{t('install.manualBody')}</p>
      )}
    </div>
  )
}
