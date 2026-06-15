import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Edit, Utensils, Pill, Stethoscope, Scale, Calendar, Layers, ChevronRight, Thermometer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import {
  reptileRepo, feedLogRepo, weightLogRepo,
  shedLogRepo, habitatLogRepo, visitLogRepo,
} from '../db/repos'
import type { Reptile, FeedLog, WeightLog, ShedLog, HabitatLog, VisitLog } from '../db/schema'
import { formatRelativeTime, calcAge } from '../lib/todoEngine'

export function ReptileDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [reptile, setReptile] = useState<Reptile | null>(null)
  const [feedLogs, setFeedLogs] = useState<FeedLog[]>([])
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [shedLogs, setShedLogs] = useState<ShedLog[]>([])
  const [habitatLogs, setHabitatLogs] = useState<HabitatLog[]>([])
  const [visitLogs, setVisitLogs] = useState<VisitLog[]>([])
  const [showQr, setShowQr] = useState(false)
  const [showPhoto, setShowPhoto] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const r = await reptileRepo.getById(id)
    if (!r) { navigate('/reptiles'); return }
    setReptile(r)
    const [feeds, weights, sheds, habitats, visits] = await Promise.all([
      feedLogRepo.getByReptile(id),
      weightLogRepo.getByReptile(id),
      shedLogRepo.getByReptile(id),
      habitatLogRepo.getByReptile(id),
      visitLogRepo.getByReptile(id),
    ])
    setFeedLogs(feeds)
    setWeightLogs(weights)
    setShedLogs(sheds)
    setHabitatLogs(habitats)
    setVisitLogs(visits)
  }, [id, navigate])

  useEffect(() => { void load() }, [load])

  const sexLabel = (sex: Reptile['sex']) => {
    if (sex === 'male') return t('common.sex.male')
    if (sex === 'female') return t('common.sex.female')
    return t('common.sex.unknown')
  }

  // weightLogs sorted oldest-first; shedLogs/feedLogs newest-first
  const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : undefined
  const prevWeight = weightLogs.length > 1 ? weightLogs[weightLogs.length - 2] : undefined
  const weightDiff = latestWeight && prevWeight ? latestWeight.weight - prevWeight.weight : undefined
  const lastShed = shedLogs[0]
  const latestHabitat = habitatLogs[0]

  type ActivityItem = {
    id: string
    sortKey: string
    iconEl: React.ReactNode
    iconBg: string
    timeLabel: string
    title: string
    subtitle?: string
  }

  const activities = useMemo<ActivityItem[]>(() => {
    const shedLabel = (status: ShedLog['status']) => {
      if (status === 'complete') return t('reptile.shed.complete')
      if (status === 'partial') return t('reptile.shed.partial')
      return t('reptile.shed.stuck')
    }

    const list: ActivityItem[] = []

    for (const l of feedLogs.slice(0, 3)) {
      list.push({
        id: `feed-${l.id}`,
        sortKey: l.fedAt,
        iconEl: <Utensils size={14} />,
        iconBg: 'bg-primary-container text-on-primary-container',
        timeLabel: formatRelativeTime(l.fedAt),
        title: `${l.foodType}${l.amount ? ` ×${l.amount}` : ''}`,
        subtitle: l.notes,
      })
    }

    for (const l of shedLogs.slice(0, 2)) {
      const sortKey = l.date + 'T12:00:00'
      list.push({
        id: `shed-${l.id}`,
        sortKey,
        iconEl: <Layers size={14} />,
        iconBg: 'bg-surface-container-high text-on-surface-variant',
        timeLabel: formatRelativeTime(sortKey),
        title: shedLabel(l.status),
        subtitle: l.notes,
      })
    }

    for (const l of weightLogs.slice(-2).reverse()) {
      const sortKey = l.date + 'T12:00:00'
      list.push({
        id: `weight-${l.id}`,
        sortKey,
        iconEl: <Scale size={14} />,
        iconBg: 'bg-secondary-container text-on-secondary-container',
        timeLabel: formatRelativeTime(sortKey),
        title: `${l.weight}g`,
        subtitle: l.notes,
      })
    }

    for (const l of visitLogs.slice(0, 2)) {
      const sortKey = l.date + 'T12:00:00'
      list.push({
        id: `visit-${l.id}`,
        sortKey,
        iconEl: <Stethoscope size={14} />,
        iconBg: 'bg-secondary-container text-on-secondary-container',
        timeLabel: formatRelativeTime(sortKey),
        title: l.summary,
        subtitle: l.notes,
      })
    }

    return list.sort((a, b) => b.sortKey.localeCompare(a.sortKey)).slice(0, 5)
  }, [feedLogs, shedLogs, weightLogs, visitLogs, t])

  if (!reptile) {
    return (
      <Layout title={t('reptile.detail')} back="/reptiles">
        <div className="flex items-center justify-center py-20 text-on-surface-variant">{t('common.loading')}</div>
      </Layout>
    )
  }

  return (
    <Layout
      title={reptile.name}
      back="/reptiles"
      action={
        <Link
          to={`/reptile/${id}/edit`}
          className="p-1.5 hover:bg-surface-container rounded-full transition-colors block"
        >
          <Edit size={18} className="text-on-surface" />
        </Link>
      }
    >
      {/* Hero Section */}
      <section className="relative w-full aspect-[4/3] overflow-hidden">
        {reptile.photoUrl ? (
          <img
            src={reptile.photoUrl}
            alt={reptile.name}
            className="w-full h-full object-cover cursor-pointer active:opacity-80"
            onClick={() => setShowPhoto(true)}
          />
        ) : (
          <div className="w-full h-full bg-primary-container flex items-center justify-center text-8xl select-none">
            🦎
          </div>
        )}

        {/* QR Code overlay */}
        <button
          onClick={() => setShowQr(true)}
          className="absolute bottom-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-white/50 active:scale-95 transition-transform"
        >
          <div className="w-16 h-16">
            <QRCodeSVG value={reptile.qrTargetUrl || window.location.href} size={64} />
          </div>
          <p className="text-[8px] text-center mt-1 font-bold text-on-surface">
            #{reptile.id.slice(-6).toUpperCase()}
          </p>
        </button>

        {/* Species / breed floating label */}
        <div className="absolute bottom-4 left-4">
          <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            {reptile.species}{reptile.breed && ` · ${reptile.breed}`}
          </span>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="px-4 py-6 flex gap-2">
        <Link
          to={`/reptile/${id}/feed`}
          className="flex-1 bg-primary text-on-primary rounded-xl py-3 px-2 flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <Utensils size={22} />
          <span className="text-[11px] font-semibold">{t('reptile.tabs.feed')}</span>
        </Link>
        <Link
          to={`/reptile/${id}/health`}
          className="flex-1 bg-secondary-container text-on-secondary-container rounded-xl py-3 px-2 flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <Stethoscope size={22} />
          <span className="text-[11px] font-semibold">{t('reptile.tabs.health')}</span>
        </Link>
        <Link
          to={`/reptile/${id}/medication`}
          className="flex-1 bg-surface-container-high text-on-surface border border-outline-variant rounded-xl py-3 px-2 flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <Pill size={22} />
          <span className="text-[11px] font-semibold">{t('reptile.tabs.medication')}</span>
        </Link>
        <Link
          to={`/reptile/${id}/environment`}
          className="flex-1 bg-surface-container-high text-on-surface border border-outline-variant rounded-xl py-3 px-2 flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <Thermometer size={22} />
          <span className="text-[11px] font-semibold">{t('reptile.tabs.environment')}</span>
        </Link>
      </section>

      {/* Health Overview Card */}
      <section className="px-4 pb-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary">{t('reptile.overview.healthOverview')}</h2>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {reptile.sex && (
                <span className="bg-primary-container text-on-primary-container px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                  {sexLabel(reptile.sex)}
                </span>
              )}
              {reptile.birthDate && (
                <span className="bg-surface-container text-on-surface-variant px-2 py-0.5 rounded text-[10px] font-bold">
                  {calcAge(reptile.birthDate)}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Weight */}
            <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/30">
              <div className="flex items-center gap-1.5 text-on-surface-variant mb-1">
                <Scale size={13} />
                <span className="text-[11px] font-semibold tracking-wide">{t('reptile.overview.lastWeight')}</span>
              </div>
              <p className="text-lg font-semibold text-primary leading-tight">
                {latestWeight ? `${latestWeight.weight}g` : t('common.notRecorded')}
              </p>
              {weightDiff !== undefined && (
                <p className="text-[10px] text-on-surface-variant mt-0.5">
                  {weightDiff >= 0 ? '+' : ''}{weightDiff}g
                </p>
              )}
            </div>

            {/* Last Shed */}
            <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/30">
              <div className="flex items-center gap-1.5 text-on-surface-variant mb-1">
                <Calendar size={13} />
                <span className="text-[11px] font-semibold tracking-wide">{t('reptile.overview.lastShed')}</span>
              </div>
              <p className="text-lg font-semibold text-secondary leading-tight">
                {lastShed ? formatRelativeTime(lastShed.date + 'T12:00:00') : t('common.notRecorded')}
              </p>
              {lastShed && (
                <p className="text-[10px] text-on-surface-variant mt-0.5">
                  {lastShed.status === 'complete'
                    ? t('reptile.shed.complete')
                    : lastShed.status === 'partial'
                    ? t('reptile.shed.partial')
                    : t('reptile.shed.stuck')}
                </p>
              )}
            </div>
          </div>

          {/* Humidity progress bar */}
          {latestHabitat?.humidity != null && (
            <div className="mt-4 pt-4 border-t border-outline-variant">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[11px] font-semibold text-on-surface-variant mb-0.5">
                    {t('environment.humidity')}
                  </p>
                  <span className="text-lg font-semibold text-primary">{latestHabitat.humidity}%</span>
                </div>
                <div className="w-24 h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(latestHabitat.humidity, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Recent Activity Timeline */}
      <section className="px-4 pb-28">
        <h2 className="text-lg font-semibold text-primary mb-4">{t('reptile.overview.recentActivity')}</h2>

        {activities.length === 0 ? (
          <p className="text-sm text-on-surface-variant text-center py-6">{t('common.noRecords')}</p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-outline-variant" />

            {activities.map((act) => (
              <div key={act.id} className="relative pl-10 pb-6">
                <div
                  className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 border-surface ${act.iconBg}`}
                >
                  {act.iconEl}
                </div>
                <div>
                  <span className="text-[11px] font-semibold tracking-wide text-on-surface-variant">
                    {act.timeLabel}
                  </span>
                  <h3 className="font-semibold text-sm text-on-surface">{act.title}</h3>
                  {act.subtitle && (
                    <p className="text-sm text-on-surface-variant">{act.subtitle}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Link
          to={`/reptile/${id}/logs`}
          className="w-full py-3 text-primary font-semibold text-sm flex items-center justify-center gap-1.5 hover:bg-surface-container rounded-lg transition-colors"
        >
          {t('reptile.overview.viewAllLogs')}
          <ChevronRight size={16} />
        </Link>
      </section>

      {/* Photo lightbox */}
      {showPhoto && reptile.photoUrl && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPhoto(false)}
        >
          <img
            src={reptile.photoUrl}
            alt={reptile.name}
            className="max-w-full max-h-full rounded-xl object-contain"
          />
        </div>
      )}

      {/* QR modal */}
      {showQr && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6"
          onClick={() => setShowQr(false)}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl p-6 space-y-4 max-w-xs w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-center text-on-surface">
              {t('reptile.qrTitle', { name: reptile.name })}
            </h3>
            <div className="flex justify-center">
              <QRCodeSVG value={reptile.qrTargetUrl || window.location.href} size={200} />
            </div>
            <p className="text-xs text-on-surface-variant text-center break-all">{reptile.qrTargetUrl}</p>
            <button
              onClick={() => setShowQr(false)}
              className="w-full bg-surface-container py-2.5 rounded-xl text-on-surface font-medium"
            >
              {t('reptile.qrClose')}
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}
