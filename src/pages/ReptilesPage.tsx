import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, CalendarDays, MapPin, SlidersHorizontal, Utensils, Scale, Layers3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { categoryRepo, reptileRepo, feedLogRepo, weightLogRepo, shedLogRepo } from '../db/repos'
import type { Reptile } from '../db/schema'
import { calcAge, formatRelativeTime, formatRelativeTimeInDays } from '../lib/todoEngine'

type ReptileCardSummary = {
  lastFedAt?: string
  lastShedDate?: string
  lastWeight?: number
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

export function ReptilesPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [reptiles, setReptiles] = useState<Reptile[]>([])
  const [cardSummaryMap, setCardSummaryMap] = useState<Record<string, ReptileCardSummary>>({})
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  useEffect(() => {
    const load = async () => {
      const [r, categoryRows] = await Promise.all([
        reptileRepo.getAll(),
        categoryRepo.getAll(),
      ])
      setReptiles(r)
      setCategories(categoryRows.map((row) => row.name))
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
        <div className="max-w-md mx-auto px-4 pt-4">
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
            {filtered.map((r) => (
              <div
                key={r.id}
                onClick={() => navigate(`/reptile/${r.id}`)}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-4 flex gap-4 cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 border border-outline-variant bg-surface-container">
                  {r.photoUrl ? (
                    <img src={r.photoUrl} alt={r.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl select-none">🦎</div>
                  )}
                </div>
                <div className="flex flex-col justify-between py-1 flex-1 min-w-0">
                  <div>
                    <h2 className="text-base font-semibold text-on-surface truncate">{r.name}</h2>
                    <p className="text-xs text-outline mt-0.5">
                      {r.species}{r.breed ? ` · ${r.breed}` : ''}
                    </p>

                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-on-surface-variant">
                        <Utensils size={13} />
                        <span className="text-[11px] font-medium">
                          {t('reptile.overview.lastFed')}：{formatRelativeTime(cardSummaryMap[r.id]?.lastFedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-on-surface-variant">
                        <Layers3 size={13} />
                        <span className="text-[11px] font-medium">
                          {t('reptile.overview.lastShed')}：{cardSummaryMap[r.id]?.lastShedDate
                            ? formatRelativeTimeInDays(`${cardSummaryMap[r.id].lastShedDate}T12:00:00`)
                            : t('common.notRecorded')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-on-surface-variant">
                        <Scale size={13} />
                        <span className="text-[11px] font-medium">
                          {t('reptile.overview.lastWeight')}：{cardSummaryMap[r.id]?.lastWeight != null
                            ? `${cardSummaryMap[r.id].lastWeight}g`
                            : t('common.notRecorded')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {r.birthDate && (
                      <div className="flex items-center gap-1 text-on-surface-variant">
                        <CalendarDays size={14} />
                        <span className="text-xs font-semibold">{calcAge(r.birthDate)}</span>
                      </div>
                    )}
                    {r.enclosureName && (
                      <div className="flex items-center gap-1 text-on-surface-variant">
                        <MapPin size={14} />
                        <span className="text-xs font-semibold truncate">{r.enclosureName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
      >
        <Plus size={28} />
      </button>
    </Layout>
  )
}
