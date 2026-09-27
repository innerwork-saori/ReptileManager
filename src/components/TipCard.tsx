import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Lightbulb, Shuffle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { availableTips, randomTipIndex } from '../lib/tips'

// A random feature tip, in the spirit of iPhone's Tips. Picks a new one on each mount.
export function TipCard({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const tips = useMemo(availableTips, [])
  const [index, setIndex] = useState(() => randomTipIndex(tips.length))
  const tip = tips[index]
  if (!tip) return null
  const { Icon } = tip

  return (
    <aside
      className={`rounded-2xl border border-tertiary bg-tertiary-container p-4 text-left ${className}`}
      aria-label={t('tips.title')}
      aria-live="polite"
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">
        <Lightbulb size={14} aria-hidden="true" />
        {t('tips.title')}
      </p>
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-container-lowest text-primary shadow-sm">
          <Icon size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-on-surface">{t(`tips.items.${tip.id}.title`)}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">{t(`tips.items.${tip.id}.body`)}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        {tip.to ? (
          <Link to={tip.to} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            {t('tips.goTo')}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ) : <span />}
        {tips.length > 1 && (
          <button
            type="button"
            onClick={() => setIndex((i) => randomTipIndex(tips.length, i))}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
          >
            <Shuffle size={14} aria-hidden="true" />
            {t('tips.another')}
          </button>
        )}
      </div>
    </aside>
  )
}
