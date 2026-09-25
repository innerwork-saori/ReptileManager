import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { UtensilsCrossed, LineChart, QrCode, ShieldCheck } from 'lucide-react'
import { isDemoMode, exitDemoMode } from '../lib/demoMode'
import { markWelcomeSeen } from '../lib/welcome'
import { reseedDemoIfLanguageChanged } from '../lib/demoSeed'
import { buildReptileQrPayload } from '../lib/qrPayload'

// Sample weights (g) for the illustrative enclosure tag; mirrors the demo ball python.
const TAG_WEIGHTS = [1420, 1465, 1510, 1540, 1590, 1635]

function sparklinePoints(values: number[], width: number, height: number): string {
  const min = Math.min(...values)
  const max = Math.max(...values)
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width
      const y = height - ((v - min) / (max - min)) * (height - 4) - 2
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function EnclosureTag() {
  const { t } = useTranslation()
  return (
    <figure
      className="relative bg-tertiary text-on-tertiary rounded-[14px] pl-9 pr-4 py-4 shadow-[0_1px_0_rgba(91,72,56,0.25),0_10px_24px_-14px_rgba(91,72,56,0.55)]"
      aria-label={t('welcome.tagAria')}
    >
      {/* punched hole, like a label hung on the enclosure */}
      <span className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-surface shadow-[inset_0_1px_2px_rgba(91,72,56,0.45)]" aria-hidden="true" />

      <div className="flex items-start gap-3">
        <img src="/demo/ballpython.jpg" alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-on-tertiary-container">{t('welcome.tagEnclosure')}</p>
          <p className="text-lg font-bold leading-tight text-on-surface">{t('welcome.tagName')}</p>
          <p className="text-xs text-on-tertiary-container">Banana Pastel</p>
        </div>
        <div className="bg-white p-1 rounded-md shrink-0">
          <QRCodeSVG value={buildReptileQrPayload('demo_reptile_mango')} size={44} fgColor="#2f312e" />
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-dashed border-on-tertiary/30 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-on-tertiary-container">{t('welcome.tagLastFed')}</p>
          <p className="text-base font-bold text-secondary">{t('welcome.tagLastFedValue')}</p>
        </div>
        <div>
          <p className="text-[11px] text-on-tertiary-container">{t('welcome.tagWeight')}</p>
          <div className="flex items-center gap-2">
            <p className="text-base font-bold text-on-surface">1,635 g</p>
            <svg viewBox="0 0 64 22" className="w-16 h-[22px] overflow-visible" aria-hidden="true">
              <polyline
                className="welcome-spark"
                points={sparklinePoints(TAG_WEIGHTS, 64, 22)}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
              />
            </svg>
          </div>
        </div>
      </div>
    </figure>
  )
}

export function WelcomePage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const demo = isDemoMode()
  const isEn = i18n.language?.startsWith('en')

  const finish = async (to: string) => {
    if (demo) await reseedDemoIfLanguageChanged()
    await markWelcomeSeen()
    navigate(to, { replace: true })
  }

  const features = [
    { icon: UtensilsCrossed, title: t('welcome.featFeedTitle'), body: t('welcome.featFeedBody') },
    { icon: LineChart, title: t('welcome.featWeightTitle'), body: t('welcome.featWeightBody') },
    { icon: QrCode, title: t('welcome.featQrTitle'), body: t('welcome.featQrBody') },
  ]

  return (
    <div className="min-h-dvh bg-surface text-on-surface">
      <div className="max-w-md mx-auto px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10 flex flex-col gap-8">
        <header className="flex items-center justify-between">
          <span className="text-sm font-bold text-primary">ReptileManager</span>
          <button
            onClick={() => void i18n.changeLanguage(isEn ? 'zh-TW' : 'en')}
            className="text-sm text-on-surface-variant px-2 py-1 rounded-md hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-primary"
          >
            {isEn ? '中文' : 'English'}
          </button>
        </header>

        <section className="flex flex-col gap-4">
          <h1 className="text-[2.25rem] leading-[1.15] font-extrabold tracking-tight text-on-surface">
            {t('welcome.headline1')}
            <br />
            {t('welcome.headline2')}
          </h1>
          <p className="text-[1.0625rem] leading-relaxed text-on-surface-variant">{t('welcome.lead')}</p>
        </section>

        <EnclosureTag />

        <ul className="flex flex-col gap-5">
          {features.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <Icon size={22} className="text-primary shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-on-surface">{title}</p>
                <p className="text-sm leading-relaxed text-on-surface-variant">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="flex gap-4 text-sm leading-relaxed text-on-surface-variant">
          <ShieldCheck size={20} className="text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <span>{t('welcome.privacy')}</span>
        </p>

        <div className="flex flex-col gap-3 pt-2">
          {demo ? (
            <>
              <button
                onClick={() => void finish('/')}
                className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-semibold active:scale-[0.98] transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {t('welcome.ctaDemo')}
              </button>
              <button
                onClick={exitDemoMode}
                className="w-full py-3 rounded-xl font-semibold text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-primary"
              >
                {t('demo.exit')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => void finish('/reptile/new')}
                className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-semibold active:scale-[0.98] transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {t('welcome.ctaStart')}
              </button>
              <a
                href="/?demo=1#/"
                className="w-full py-3 rounded-xl font-semibold text-center text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-primary"
              >
                {t('welcome.ctaTryDemo')}
              </a>
              <button
                onClick={() => void finish('/')}
                className="self-center text-sm text-on-surface-variant underline underline-offset-4 py-1"
              >
                {t('welcome.skip')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
