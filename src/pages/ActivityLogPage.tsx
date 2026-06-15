import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Utensils, Scale, RefreshCw, Stethoscope, Pill, Thermometer, Layers, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Layout } from '../components/Layout'
import {
  reptileRepo,
  feedLogRepo,
  weightLogRepo,
  shedLogRepo,
  visitLogRepo,
  medicationLogRepo,
  habitatLogRepo,
  substrateLogRepo,
} from '../db/repos'

type FilterType = 'all' | 'feed' | 'health' | 'medication' | 'environment'
type LogType = 'feed' | 'weight' | 'shed' | 'visit' | 'medication' | 'habitat' | 'substrate'

interface ActivityEntry {
  id: string
  type: LogType
  dateIso: string
  subtitle?: string
  notes?: string
  shedStatus?: 'complete' | 'partial' | 'stuck'
}

const FILTER_BUCKET: Record<LogType, FilterType> = {
  feed: 'feed',
  weight: 'health',
  shed: 'health',
  visit: 'health',
  medication: 'medication',
  habitat: 'environment',
  substrate: 'environment',
}

interface TypeStyle {
  Icon: LucideIcon
  iconBg: string
  iconColor: string
}

const TYPE_STYLE: Record<LogType, TypeStyle> = {
  feed:       { Icon: Utensils,    iconBg: 'bg-secondary-container/30', iconColor: 'text-secondary' },
  weight:     { Icon: Scale,       iconBg: 'bg-primary-container/20',   iconColor: 'text-primary' },
  shed:       { Icon: RefreshCw,   iconBg: 'bg-primary-container/20',   iconColor: 'text-primary' },
  visit:      { Icon: Stethoscope, iconBg: 'bg-error-container/20',     iconColor: 'text-error' },
  medication: { Icon: Pill,        iconBg: 'bg-primary-container/20',   iconColor: 'text-primary' },
  habitat:    { Icon: Thermometer, iconBg: 'bg-tertiary-container/20',  iconColor: 'text-tertiary' },
  substrate:  { Icon: Layers,      iconBg: 'bg-tertiary-container/20',  iconColor: 'text-tertiary' },
}

function extractTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function ActivityLogPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [reptileName, setReptileName] = useState('')
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    const reptile = await reptileRepo.getById(id)
    if (!reptile) { navigate('/reptiles'); return }
    setReptileName(reptile.name)

    const [feeds, weights, sheds, visits, meds, habitats, substrates] = await Promise.all([
      feedLogRepo.getByReptile(id),
      weightLogRepo.getByReptile(id),
      shedLogRepo.getByReptile(id),
      visitLogRepo.getByReptile(id),
      medicationLogRepo.getByReptile(id),
      habitatLogRepo.getByReptile(id),
      substrateLogRepo.getByReptile(id),
    ])

    const all: ActivityEntry[] = [
      ...feeds.map((l) => ({
        id: `feed-${l.id}`,
        type: 'feed' as LogType,
        dateIso: l.fedAt,
        subtitle: l.amount ? `${l.foodType} ×${l.amount}` : l.foodType,
        notes: l.notes,
      })),
      ...weights.map((l) => ({
        id: `weight-${l.id}`,
        type: 'weight' as LogType,
        dateIso: `${l.date}T00:00:00`,
        subtitle: `${l.weight} g`,
        notes: l.notes,
      })),
      ...sheds.map((l) => ({
        id: `shed-${l.id}`,
        type: 'shed' as LogType,
        dateIso: `${l.date}T00:00:00`,
        shedStatus: l.status,
        notes: l.notes,
      })),
      ...visits.map((l) => ({
        id: `visit-${l.id}`,
        type: 'visit' as LogType,
        dateIso: `${l.date}T00:00:00`,
        subtitle: l.summary,
        notes: l.notes,
      })),
      ...meds.map((l) => ({
        id: `med-${l.id}`,
        type: 'medication' as LogType,
        dateIso: l.takenAt,
        subtitle: l.dosage ? `${l.drugName} · ${l.dosage}` : l.drugName,
        notes: l.notes,
      })),
      ...habitats.map((l) => ({
        id: `habitat-${l.id}`,
        type: 'habitat' as LogType,
        dateIso: l.loggedAt,
        subtitle: [
          l.temperature != null ? `${l.temperature}°C` : null,
          l.humidity != null ? `${l.humidity}%` : null,
        ].filter(Boolean).join(' · ') || undefined,
        notes: l.notes,
      })),
      ...substrates.map((l) => ({
        id: `substrate-${l.id}`,
        type: 'substrate' as LogType,
        dateIso: l.changedAt,
        subtitle: l.substrateType,
        notes: l.notes,
      })),
    ]

    all.sort((a, b) => b.dateIso.localeCompare(a.dateIso))
    setEntries(all)
  }, [id, navigate])

  useEffect(() => { void load() }, [load])

  const typeTitle = useMemo((): Record<LogType, string> => ({
    feed: t('feed.title'),
    weight: t('health.tabs.weight'),
    shed: t('health.tabs.shed'),
    visit: t('health.tabs.visit'),
    medication: t('medication.title'),
    habitat: t('environment.tabs.habitat'),
    substrate: t('environment.tabs.substrate'),
  }), [t])

  const shedLabel = useMemo((): Record<string, string> => ({
    complete: t('health.shed.complete'),
    partial: t('health.shed.partial'),
    stuck: t('health.shed.stuck'),
  }), [t])

  const filtered = useMemo(() => {
    let result = entries
    if (filter !== 'all') {
      result = result.filter((e) => FILTER_BUCKET[e.type] === filter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (e) =>
          typeTitle[e.type].toLowerCase().includes(q) ||
          (e.subtitle?.toLowerCase().includes(q) ?? false) ||
          (e.notes?.toLowerCase().includes(q) ?? false) ||
          (e.shedStatus != null && shedLabel[e.shedStatus].toLowerCase().includes(q)),
      )
    }
    return result
  }, [entries, filter, search, typeTitle, shedLabel])

  const groups = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>()
    for (const e of filtered) {
      const key = e.dateIso.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return [...map.entries()]
  }, [filtered])

  const todayKey = new Date().toISOString().slice(0, 10)
  const yesterdayKey = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all',         label: t('activityLog.filterAll') },
    { key: 'feed',        label: t('activityLog.filterFeed') },
    { key: 'health',      label: t('activityLog.filterHealth') },
    { key: 'medication',  label: t('activityLog.filterMedication') },
    { key: 'environment', label: t('activityLog.filterEnvironment') },
  ]

  return (
    <Layout title={`${reptileName} · ${t('activityLog.title')}`} back={`/reptile/${id}`}>
      <div className="px-4 pt-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('activityLog.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                filter === key
                  ? 'bg-primary-container text-on-primary-container border-primary/10 shadow-sm'
                  : 'bg-surface-container-high text-on-surface-variant border-outline-variant'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        {groups.length === 0 ? (
          <p className="text-center text-on-surface-variant text-sm py-12">{t('activityLog.noResults')}</p>
        ) : (
          <div className="relative space-y-6 pb-4">
            {/* Vertical connector line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-outline-variant/60 z-0" />

            {groups.map(([dateKey, items]) => (
              <section key={dateKey} className="relative z-10">
                {/* Date header */}
                <div className="flex items-center gap-4 mb-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-sm border-4 border-surface shrink-0 ${
                      dateKey === todayKey
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-dim text-on-surface-variant'
                    }`}
                  >
                    {dateKey === todayKey ? t('activityLog.todayShort') : dateKey.slice(8)}
                  </div>
                  <h2 className="text-sm font-semibold text-on-surface">
                    {dateKey === todayKey
                      ? t('activityLog.today')
                      : dateKey === yesterdayKey
                      ? t('activityLog.yesterday')
                      : dateKey.replace(/-/g, '/')}
                  </h2>
                </div>

                {/* Entry cards */}
                <div className="ml-12 space-y-3">
                  {items.map((entry) => {
                    const { Icon, iconBg, iconColor } = TYPE_STYLE[entry.type]
                    const hasTime = !entry.dateIso.endsWith('T00:00:00')
                    const subtitle = entry.shedStatus != null ? shedLabel[entry.shedStatus] : entry.subtitle
                    return (
                      <div
                        key={entry.id}
                        className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                            <Icon size={18} className={iconColor} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-on-surface">{typeTitle[entry.type]}</h3>
                              {hasTime && (
                                <span className="text-xs text-outline">{extractTime(entry.dateIso)}</span>
                              )}
                            </div>
                            {subtitle && (
                              <p className="text-sm text-on-surface-variant mt-0.5">{subtitle}</p>
                            )}
                            {entry.notes && (
                              <p className="text-xs text-outline mt-1 leading-relaxed">{entry.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
