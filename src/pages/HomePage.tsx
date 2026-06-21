import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { UtensilsCrossed, Scale, RefreshCw, ChevronRight, Plus, Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { reptileRepo, feedLogRepo, weightLogRepo, shedLogRepo, medicationCourseRepo } from '../db/repos'
import type { Reptile, FeedLog, WeightLog, ShedLog, MedicationCourse } from '../db/schema'
import { formatRelativeTime, formatDate } from '../lib/todoEngine'

type RecentWeight = WeightLog & { reptileName: string; reptileBreed: string; reptilePhotoUrl?: string }
type RecentShed = ShedLog & { reptileName: string; reptileBreed: string; reptilePhotoUrl?: string }
type OverdueFeed = {
  reptileId: string
  reptileName: string
  reptileBreed: string
  reptilePhotoUrl?: string
  lastFedAt?: string
}

interface ReptileCard {
  reptile: Reptile
  lastFeed?: FeedLog
  pendingMeds: MedicationCourse[]
}

export function HomePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [cards, setCards] = useState<ReptileCard[]>([])
  const [overdueFeeds, setOverdueFeeds] = useState<OverdueFeed[]>([])
  const [recentWeights, setRecentWeights] = useState<RecentWeight[]>([])
  const [recentSheds, setRecentSheds] = useState<RecentShed[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const reptiles = await reptileRepo.getAll()
    const rMap = new Map(reptiles.map((r) => [r.id, r.name]))
    const rPhotoMap = new Map(reptiles.map((r) => [r.id, r.photoUrl]))
    const rBreedMap = new Map(reptiles.map((r) => [r.id, r.breed]))

    const [cardData, weightLogs, shedLogs] = await Promise.all([
      Promise.all(
        reptiles.map(async (r) => {
          const [lastFeed, activeCourses] = await Promise.all([
            feedLogRepo.getLatestByReptile(r.id),
            medicationCourseRepo.getActiveByReptile(r.id),
          ])
          const today = new Date()
          const pendingMeds = activeCourses.filter((c) => {
            if (!c.endDate) return true
            return new Date(c.endDate) >= today
          })
          return { reptile: r, lastFeed, pendingMeds }
        }),
      ),
      weightLogRepo.getRecent(5),
      shedLogRepo.getRecent(5),
    ])

    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    const overdue = cardData
      .filter(({ lastFeed }) => !lastFeed || new Date(lastFeed.fedAt) < tenDaysAgo)
      .sort((a, b) => {
        if (!a.lastFeed && !b.lastFeed) {
          return a.reptile.name.localeCompare(b.reptile.name)
        }
        if (!a.lastFeed) return -1
        if (!b.lastFeed) return 1
        return new Date(a.lastFeed.fedAt).getTime() - new Date(b.lastFeed.fedAt).getTime()
      })
      .map(({ reptile, lastFeed }) => ({
        reptileId: reptile.id,
        reptileName: reptile.name,
        reptileBreed: reptile.breed,
        reptilePhotoUrl: reptile.photoUrl,
        lastFedAt: lastFeed?.fedAt,
      }))

    setCards(cardData)
    setOverdueFeeds(overdue)
    setRecentWeights(weightLogs.map((log) => ({ ...log, reptileName: rMap.get(log.reptileId) ?? t('common.unknown'), reptileBreed: rBreedMap.get(log.reptileId) ?? '', reptilePhotoUrl: rPhotoMap.get(log.reptileId) })))
    setRecentSheds(shedLogs.map((log) => ({ ...log, reptileName: rMap.get(log.reptileId) ?? t('common.unknown'), reptileBreed: rBreedMap.get(log.reptileId) ?? '', reptilePhotoUrl: rPhotoMap.get(log.reptileId) })))
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const allPendingMeds = cards.flatMap(({ reptile, pendingMeds }) =>
    pendingMeds.map((med) => ({ ...med, reptileName: reptile.name }))
  )

  if (loading) {
    return (
      <Layout title={t('home.title')}>
        <div className="flex items-center justify-center py-20 text-on-surface-variant">{t('common.loading')}</div>
      </Layout>
    )
  }

  return (
    <Layout
      title={t('home.title')}
      action={
        <button
          onClick={() => navigate('/reptile/new')}
          className="p-1.5 rounded-full bg-primary-container text-on-primary-container hover:bg-primary-container/80 transition-colors"
        >
          <Plus size={18} />
        </button>
      }
    >
      <div className="py-4 space-y-6">

        {/* Recent high-frequency info */}
        {cards.length > 0 && (
          <section className="px-4 grid gap-4 lg:grid-cols-3">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-4">
              <div className="flex items-center gap-2 mb-1">
                <UtensilsCrossed size={18} className="text-primary shrink-0" />
                <h2 className="font-bold text-lg text-on-surface">{t('home.recentFeedings')}</h2>
              </div>
              <p className="text-xs text-on-surface-variant mb-3">{t('home.recentFeedingsSubtitle')}</p>
              <div className="space-y-2">
                {overdueFeeds.length > 0 ? overdueFeeds.slice(0, 3).map((feed) => (
                  <button
                    key={feed.reptileId}
                    onClick={() => navigate(`/reptile/${feed.reptileId}/feed`)}
                    className="w-full rounded-xl bg-white px-3 py-2.5 text-left transition-transform active:scale-[0.99] shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container shrink-0">
                        {feed.reptilePhotoUrl
                          ? <img src={feed.reptilePhotoUrl} alt={feed.reptileName} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-2xl">🦎</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-on-surface leading-snug">{feed.reptileBreed || feed.reptileName}</p>
                        {feed.reptileBreed && <p className="text-xs text-on-surface-variant">{feed.reptileName}</p>}
                        <p className="text-xs text-secondary font-medium">{t('home.lastFed', { time: feed.lastFedAt ? formatRelativeTime(feed.lastFedAt) : t('common.notRecorded') })}</p>
                        <p className="text-xs text-on-surface-variant">{feed.lastFedAt ? formatDate(feed.lastFedAt) : t('home.neverFed')}</p>
                      </div>
                      <ChevronRight size={16} className="text-on-surface-variant shrink-0" />
                    </div>
                  </button>
                )) : (
                  <p className="py-6 text-center text-sm text-on-surface-variant">{t('common.noRecords')}</p>
                )}
              </div>
              {overdueFeeds.length > 3 && (
                <button
                  onClick={() => navigate('/reptiles')}
                  className="mt-3 w-full bg-primary text-on-primary rounded-xl py-2.5 text-sm font-semibold text-center"
                >
                  {t('home.viewAll')} (View All) »
                </button>
              )}
            </div>

            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-4">
              <div className="flex items-center gap-2 mb-1">
                <Scale size={18} className="text-secondary shrink-0" />
                <h2 className="font-bold text-lg text-on-surface">{t('home.weightInfo')}</h2>
              </div>
              <p className="text-xs text-on-surface-variant mb-3">{t('home.weightInfoSubtitle')}</p>
              <div className="space-y-2">
                {recentWeights.length > 0 ? recentWeights.slice(0, 3).map((weight) => (
                  <button
                    key={weight.id}
                    onClick={() => navigate(`/reptile/${weight.reptileId}/health`)}
                    className="w-full rounded-xl bg-white px-3 py-2.5 text-left transition-transform active:scale-[0.99] shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container shrink-0">
                        {weight.reptilePhotoUrl
                          ? <img src={weight.reptilePhotoUrl} alt={weight.reptileName} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-2xl">🦎</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-on-surface leading-snug">{weight.reptileBreed || weight.reptileName}</p>
                        {weight.reptileBreed && <p className="text-xs text-on-surface-variant">{weight.reptileName}</p>}
                        <p className="text-xs text-secondary font-medium">{weight.weight} g</p>
                        <p className="text-xs text-on-surface-variant">{formatDate(weight.date)}</p>
                      </div>
                      <ChevronRight size={16} className="text-on-surface-variant shrink-0" />
                    </div>
                  </button>
                )) : (
                  <p className="py-6 text-center text-sm text-on-surface-variant">{t('common.noRecords')}</p>
                )}
              </div>
              {recentWeights.length > 3 && (
                <button
                  onClick={() => navigate('/reptiles')}
                  className="mt-3 w-full bg-primary text-on-primary rounded-xl py-2.5 text-sm font-semibold text-center"
                >
                  {t('home.viewAll')} (View All) »
                </button>
              )}
            </div>

            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-4">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw size={18} className="text-tertiary shrink-0" />
                <h2 className="font-bold text-lg text-on-surface">{t('home.shedInfo')}</h2>
              </div>
              <p className="text-xs text-on-surface-variant mb-3">{t('home.shedInfoSubtitle')}</p>
              <div className="space-y-2">
                {recentSheds.length > 0 ? recentSheds.slice(0, 3).map((shed) => (
                  <button
                    key={shed.id}
                    onClick={() => navigate(`/reptile/${shed.reptileId}/health`)}
                    className="w-full rounded-xl bg-white px-3 py-2.5 text-left transition-transform active:scale-[0.99] shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container shrink-0">
                        {shed.reptilePhotoUrl
                          ? <img src={shed.reptilePhotoUrl} alt={shed.reptileName} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-2xl">🦎</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-on-surface leading-snug">{shed.reptileBreed || shed.reptileName}</p>
                        {shed.reptileBreed && <p className="text-xs text-on-surface-variant">{shed.reptileName}</p>}
                        <p className="text-xs text-secondary font-medium">{t(`health.shed.${shed.status}`)}</p>
                        <p className="text-xs text-on-surface-variant">{formatDate(shed.date)}</p>
                      </div>
                      <ChevronRight size={16} className="text-on-surface-variant shrink-0" />
                    </div>
                  </button>
                )) : (
                  <p className="py-6 text-center text-sm text-on-surface-variant">{t('common.noRecords')}</p>
                )}
              </div>
              {recentSheds.length > 3 && (
                <button
                  onClick={() => navigate('/reptiles')}
                  className="mt-3 w-full bg-primary text-on-primary rounded-xl py-2.5 text-sm font-semibold text-center"
                >
                  {t('home.viewAll')} (View All) »
                </button>
              )}
            </div>
          </section>
        )}

        {/* My Reptiles */}
        {cards.length > 0 ? (
          <section className="px-4">
            <div className="flex justify-between items-end mb-3">
              <div>
                <h2 className="font-bold text-lg text-on-surface">{t('home.myReptiles')}</h2>
                <p className="text-xs text-on-surface-variant">{t('home.myReptilesSubtitle')}</p>
              </div>
              <button
                onClick={() => navigate('/reptiles')}
                className="text-primary text-sm font-semibold"
              >
                {t('home.viewAll')}
              </button>
            </div>
            <div className="flex overflow-x-auto gap-3 hide-scrollbar -mx-4 px-4 py-2">
              {cards.map(({ reptile, lastFeed }) => (
                <div
                  key={reptile.id}
                  onClick={() => navigate(`/reptile/${reptile.id}`)}
                  className="w-[160px] bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant overflow-hidden shrink-0 cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="h-28 w-full bg-surface-container">
                    {reptile.photoUrl ? (
                      <img
                        src={reptile.photoUrl}
                        alt={reptile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        🦎
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-on-surface leading-snug">{reptile.breed || reptile.name}</h3>
                    <p className="text-xs text-on-surface-variant truncate">
                      {reptile.breed ? reptile.name : reptile.species}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <UtensilsCrossed size={11} className="text-primary shrink-0" />
                      <p className="text-xs text-on-surface-variant truncate">
                        {t('home.lastFed', { time: formatRelativeTime(lastFeed?.fedAt) })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-on-surface-variant mx-4">
            <span className="text-6xl">🦎</span>
            <p className="text-center text-sm">{t('home.noReptiles')}</p>
            <button
              onClick={() => navigate('/reptile/new')}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-full text-sm font-semibold"
            >
              {t('home.addFirst')}
            </button>
          </div>
        )}

        {/* Medication Reminders */}
        {allPendingMeds.length > 0 && (
          <section className="mx-4 bg-secondary-container/20 p-4 rounded-2xl border border-secondary/30">
            <div className="flex items-center gap-2 mb-1">
              <Bell size={18} className="text-secondary shrink-0" />
              <h2 className="font-bold text-lg text-on-surface">{t('home.activeMeds')}</h2>
            </div>
            {t('home.activeMedsSubtitle') && <p className="text-xs text-on-surface-variant mb-3">{t('home.activeMedsSubtitle')}</p>}
            <div className="space-y-2">
              {allPendingMeds.map((med) => (
                <button
                  key={med.id}
                  onClick={() => navigate(`/reptile/${med.reptileId}/medication`)}
                  className="w-full bg-white/60 p-3 rounded-xl border border-secondary/20 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm text-on-surface truncate">{med.drugName}</span>
                    <span className="text-xs text-secondary font-medium shrink-0 ml-2">{med.reptileName}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">{med.dosage}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="h-2" />
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/reptile/new')}
        className="fixed right-4 bottom-24 bg-primary text-on-primary p-4 rounded-full shadow-xl active:scale-95 transition-transform z-40"
        aria-label={t('reptile.new')}
      >
        <Plus size={24} />
      </button>
    </Layout>
  )
}
