import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, UtensilsCrossed, Check, ChevronRight, Plus, Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { reptileRepo, feedLogRepo, todoRuleRepo, todoInstanceRepo, medicationCourseRepo } from '../db/repos'
import type { Reptile, FeedLog, TodoInstance, MedicationCourse } from '../db/schema'
import { computeTodayInstances, formatRelativeTime } from '../lib/todoEngine'

interface ReptileCard {
  reptile: Reptile
  lastFeed?: FeedLog
  pendingMeds: MedicationCourse[]
}

export function HomePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [cards, setCards] = useState<ReptileCard[]>([])
  const [todos, setTodos] = useState<TodoInstance[]>([])
  const [reptileMap, setReptileMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const reptiles = await reptileRepo.getAll()
    const rMap = new Map(reptiles.map((r) => [r.id, r.name]))
    setReptileMap(rMap)

    const cardData = await Promise.all(
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
    )
    setCards(cardData)

    const allRules = await todoRuleRepo.getAll()
    const todayStr = new Date().toISOString().slice(0, 10)
    const existingInstances = await todoInstanceRepo.getByDate(todayStr)
    const computed = computeTodayInstances(allRules, existingInstances)
    const newInstances = computed.filter((c) => !existingInstances.find((e) => e.id === c.id))
    if (newInstances.length > 0) await todoInstanceRepo.upsertMany(newInstances)
    setTodos(computed.sort((a, b) => (a.dueAt ?? a.date).localeCompare(b.dueAt ?? b.date)))
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const pendingTodos = todos.filter((t) => t.status === 'pending')
  const doneTodos = todos.filter((t) => t.status !== 'pending')

  const allPendingMeds = cards.flatMap(({ reptile, pendingMeds }) =>
    pendingMeds.map((med) => ({ ...med, reptileName: reptile.name }))
  )

  const handleTodoDone = async (id: string) => {
    await todoInstanceRepo.updateStatus(id, 'done')
    void load()
  }

  const handleTodoRevert = async (id: string) => {
    await todoInstanceRepo.updateStatus(id, 'pending')
    void load()
  }

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

        {/* Dashboard Overview Card */}
        {cards.length > 0 && (
          <section className="mx-4 bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-outline-variant">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-bold text-lg text-on-surface">{t('home.dashboardTitle')}</h2>
                {t('home.dashboardSubtitle') && <p className="text-xs text-on-surface-variant">{t('home.dashboardSubtitle')}</p>}
              </div>
              <span className="bg-primary-container text-on-primary-container text-xs font-semibold px-3 py-1 rounded-full">
                {t('home.todayActive')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary rounded-full">
                <ClipboardList size={22} className="text-on-primary" />
              </div>
              <div>
                <p className="font-bold text-primary">
                  {t('home.todayTodosCount', { count: pendingTodos.length })}
                </p>
                <p className="text-xs text-on-surface-variant">{t('home.tasksPending', { count: pendingTodos.length })}</p>
              </div>
            </div>
          </section>
        )}

        {/* My Reptiles */}
        {cards.length > 0 ? (
          <section className="px-4">
            <div className="flex justify-between items-end mb-3">
              <div>
                <h2 className="font-bold text-lg text-on-surface">{t('home.myReptiles')}</h2>
                {t('home.myReptilesSubtitle') && <p className="text-xs text-on-surface-variant">{t('home.myReptilesSubtitle')}</p>}
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
                    <h3 className="font-semibold text-sm text-on-surface truncate">{reptile.name}</h3>
                    <p className="text-xs text-on-surface-variant truncate">
                      {reptile.species}{reptile.breed && ` · ${reptile.breed}`}
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

        {/* Today's Tasks */}
        {todos.length > 0 && (
          <section className="mx-4 space-y-2">
            <div className="mb-3">
              <h2 className="font-bold text-lg text-on-surface">{t('home.todayTasks')}</h2>
              {t('home.todayTasksSubtitle') && <p className="text-xs text-on-surface-variant">{t('home.todayTasksSubtitle')}</p>}
            </div>

            {pendingTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleTodoDone(todo.id)}
                    className="w-6 h-6 rounded border-2 border-primary flex items-center justify-center shrink-0 active:scale-90 transition-transform"
                    aria-label={t('todoItem.done')}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-on-surface truncate">{todo.label}</p>
                    {todo.reptileId && reptileMap.get(todo.reptileId) && (
                      <p className="text-xs text-on-surface-variant">{reptileMap.get(todo.reptileId)}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (todo.reptileId) {
                      navigate(`/reptile/${todo.reptileId}/todos`)
                    } else {
                      navigate('/todos')
                    }
                  }}
                  className="p-1 rounded-full hover:bg-surface-container transition-colors"
                  aria-label={t('common.view')}
                >
                  <ChevronRight size={20} className="text-on-surface-variant" />
                </button>
              </div>
            ))}

            {pendingTodos.length === 0 && (
              <div className="flex items-center justify-center p-4 bg-primary-container/30 rounded-2xl">
                <p className="text-sm text-primary font-semibold">{t('home.allDone')}</p>
              </div>
            )}

            {doneTodos.length > 0 && (
              <>
                <div className="px-1 pt-2 pb-1 text-xs text-on-surface-variant font-semibold">
                  {t('home.handled')}
                </div>
                {doneTodos.map((todo) => (
                  <button
                    key={todo.id}
                    onClick={() => handleTodoRevert(todo.id)}
                    className="w-full flex items-center gap-3 p-4 bg-surface-container rounded-2xl border border-outline-variant opacity-60 hover:opacity-80 active:scale-[0.98] transition-all text-left"
                  >
                    <div className="w-6 h-6 rounded bg-primary flex items-center justify-center shrink-0">
                      <Check size={14} className="text-on-primary" />
                    </div>
                    <p className="text-sm text-on-surface line-through truncate">{todo.label}</p>
                  </button>
                ))}
              </>
            )}
          </section>
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
