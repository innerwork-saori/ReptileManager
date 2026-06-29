import { useEffect, useState, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Search, SlidersHorizontal, Utensils, Scale, Layers3, RefreshCw, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { reptileRepo, feedLogRepo, weightLogRepo, shedLogRepo } from '../db/repos'
import type { Reptile } from '../db/schema'
import { calcAge, formatRelativeTime, formatRelativeTimeInDays } from '../lib/todoEngine'

type ReptileCardSummary = {
  lastFedAt?: string
  lastShedDate?: string
  lastWeight?: number
}

type ReptilesPageLocationState = {
  restoreReptileId?: string
}

function fuzzyMatch(reptile: Reptile, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = `${reptile.name} ${reptile.species} ${reptile.breed}`.toLowerCase()
  return q.split(/\s+/).every((word) => haystack.includes(word))
}

function matchesCategory(reptile: Reptile, filter: string): boolean {
  if (filter === 'all') return true
  return (reptile.category ?? '').trim().toLowerCase() === filter.trim().toLowerCase()
}

function getUsedCategories(reptiles: Reptile[]): string[] {
  const seen = new Set<string>()
  const used: string[] = []

  for (const reptile of reptiles) {
    const category = (reptile.category ?? '').trim()
    const normalized = category.toLowerCase()
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    used.push(category)
  }

  return used.sort((a, b) => a.localeCompare(b))
}

export function ReptilesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [reptiles, setReptiles] = useState<Reptile[]>([])
  const [cardSummaryMap, setCardSummaryMap] = useState<Record<string, ReptileCardSummary>>({})
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [highlightedReptileId, setHighlightedReptileId] = useState<string | null>(null)
  const restoredIdRef = useRef<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const r = await reptileRepo.getAll()
      setReptiles(r)
      setCategories(getUsedCategories(r))
      const summaryEntries = await Promise.all(
        r.map(async (reptile) => {
          const [lastFeed, lastWeight, lastShed] = await Promise.all([
            feedLogRepo.getLatestByReptile(reptile.id),
            weightLogRepo.getLatestByReptile(reptile.id),
            shedLogRepo.getLatestByReptile(reptile.id),
          ])
          return [
            reptile.id,
            {
              lastFedAt: lastFeed?.fedAt,
              lastShedDate: lastShed?.date,
              lastWeight: lastWeight?.weight,
            } satisfies ReptileCardSummary,
          ] as const
        }),
      )
      setCardSummaryMap(Object.fromEntries(summaryEntries))
      setLoading(false)
    }

    void load()
  }, [])

  const filtered = useMemo(
    () => reptiles.filter((r) => fuzzyMatch(r, search) && matchesCategory(r, category)),
    [reptiles, search, category],
  )

  const categoryFilters = [
    { key: 'all', label: t('reptile.filterAll') },
    ...categories.map((name) => ({ key: name, label: name })),
  ]

  useEffect(() => {
    if (loading) return

    const restoreReptileId = (location.state as ReptilesPageLocationState | null)?.restoreReptileId
    if (!restoreReptileId || restoredIdRef.current === restoreReptileId) return

    const targetCard = document.getElementById(`reptile-card-${restoreReptileId}`)

    if (targetCard) {
      setHighlightedReptileId(restoreReptileId)
      requestAnimationFrame(() => {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })

      window.setTimeout(() => {
        setHighlightedReptileId((current) => (current === restoreReptileId ? null : current))
      }, 1000)
    } else {
      window.scrollTo(0, 0)
    }

    restoredIdRef.current = restoreReptileId
  }, [filtered, loading, location.state])

  return (
    <Layout title={t('reptile.list')}>
      {loading ? (
        <div className="flex items-center justify-center py-20 text-on-surface-variant">
          {t('common.loading')}
        </div>
      ) : reptiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-on-surface-variant px-6">
          <p className="text-center text-sm">{t('reptile.noReptiles')}</p>
          <button
            onClick={() => navigate('/reptile/new')}
            className="bg-primary text-on-primary px-6 py-2 rounded-full text-sm font-semibold"
          >
            {t('reptile.addFirst')}
          </button>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          {/* Search & filter chips */}
          <div className="flex flex-col gap-2 mb-6">
            <div className="relative flex items-center">
              <Search size={16} className="absolute left-3 text-outline pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('reptile.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categoryFilters.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`flex items-center gap-1 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 shrink-0 ${
                    category === key
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant border border-outline-variant hover:bg-surface-container-high'
                  }`}
                >
                  {key === 'all' && <SlidersHorizontal size={13} />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Reptile cards */}
          <div className="flex flex-col gap-4">
            {filtered.map((r) => {
              const summary = cardSummaryMap[r.id]
              const title = r.breed.trim() || `${r.name} / ${r.id}`
              const lastFed = formatRelativeTime(summary?.lastFedAt)
              const lastShed = summary?.lastShedDate
                ? formatRelativeTimeInDays(`${summary.lastShedDate}T12:00:00`)
                : t('common.notRecorded')
              const lastWeight = summary?.lastWeight != null ? `${summary.lastWeight}g` : t('common.notRecorded')

              return (
                <article
                  key={r.id}
                  id={`reptile-card-${r.id}`}
                  onClick={() => navigate(`/reptile/${r.id}`)}
                  className={`bg-surface-container-lowest border border-outline-variant rounded-3xl shadow-sm overflow-hidden p-4 md:p-5 cursor-pointer transition-all duration-500 active:scale-[0.99] ${
                    highlightedReptileId === r.id ? 'ring-2 ring-primary shadow-lg' : ''
                  }`}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-4 md:gap-5">
                      <div className="w-28 md:w-36 shrink-0 flex md:flex-col gap-3">
                        <div className="relative">
                          <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden border border-outline-variant bg-surface-container shadow-sm">
                            {r.photoUrl ? (
                              <img src={r.photoUrl} alt={r.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-4xl select-none">🦎</div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/reptile/${r.id}/edit`)
                            }}
                            aria-label={t('common.edit')}
                            className="absolute -bottom-2 -right-2 bg-surface-container-lowest text-on-surface border border-outline-variant rounded-full p-1.5 shadow-sm hover:text-primary transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/reptile/${r.id}/edit`)
                          }}
                          className="hidden md:flex w-full px-3 py-2 rounded-xl border border-outline-variant text-on-surface text-sm font-semibold hover:bg-surface-container transition-colors items-center justify-center gap-1.5"
                        >
                          <Pencil size={14} />
                          {t('common.edit')}
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="text-2xl md:text-3xl leading-tight font-semibold text-on-surface truncate">{title}</h2>
                        <h4 className="text-xl font-semibold text-on-surface truncate mt-1">{r.name}</h4>
                        <p className="text-lg italic text-secondary truncate mt-1">{r.species}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
                          {r.birthDate && <span>{calcAge(r.birthDate)}</span>}
                          {r.enclosureName && <span>{r.enclosureName}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-surface-container-low border border-outline-variant/40 rounded-2xl p-2.5">
                      <div className="flex flex-col items-center justify-center gap-1.5 px-1.5 border-r border-outline-variant/35">
                        <Utensils size={16} className="text-primary" />
                        <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{t('reptile.overview.lastFed')}</span>
                        <span className="text-xs md:text-sm font-semibold text-on-surface text-center leading-tight">{lastFed}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-1.5 px-1.5 border-r border-outline-variant/35">
                        <Layers3 size={16} className="text-secondary" />
                        <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{t('reptile.overview.lastShed')}</span>
                        <span className="text-xs md:text-sm font-semibold text-on-surface text-center leading-tight">{lastShed}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-1.5 px-1.5">
                        <Scale size={16} className="text-on-surface-variant" />
                        <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{t('reptile.overview.lastWeight')}</span>
                        <span className="text-xs md:text-sm font-semibold text-on-surface text-center leading-tight">{lastWeight}</span>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/reptile/${r.id}/feed`, {
                            state: {
                              sourceReptileId: r.id,
                              returnTo: '/reptiles',
                            },
                          })
                        }}
                        className="flex-1 bg-primary text-on-primary px-3 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Utensils size={15} />
                        {t('reptile.feedBtn')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/reptile/${r.id}/health`, {
                            state: {
                              sourceReptileId: r.id,
                              returnTo: '/reptiles',
                            },
                          })
                        }}
                        className="flex-1 bg-primary text-on-primary px-3 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw size={15} />
                        {t('reptile.shedBtn')}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
            {filtered.length === 0 && (
              <p className="text-center text-on-surface-variant text-sm py-8">{t('common.noRecords')}</p>
            )}
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate('/reptile/new')}
        aria-label={t('reptile.new')}
        className="fixed right-4 bottom-24 bg-primary text-on-primary p-4 rounded-full shadow-xl active:scale-95 transition-transform z-40"
      >
        <Plus size={24} />
      </button>
    </Layout>
  )
}
