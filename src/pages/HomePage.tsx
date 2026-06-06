import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Clock, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { Card, Section } from '../components/Card'
import { TodoItem } from '../components/TodoItem'
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
    const allInstances = await todoInstanceRepo.getByDate(todayStr)
    setTodos(allInstances.sort((a, b) => (a.dueAt ?? a.date).localeCompare(b.dueAt ?? b.date)))
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const pendingTodos = todos.filter((t) => t.status === 'pending')
  const doneTodos = todos.filter((t) => t.status !== 'pending')

  if (loading) {
    return (
      <Layout title={t('home.title')}>
        <div className="flex items-center justify-center py-20 text-gray-400">{t('common.loading')}</div>
      </Layout>
    )
  }

  return (
    <Layout
      title={t('home.title')}
      action={
        <button
          onClick={() => navigate('/reptile/new')}
          className="p-1.5 rounded-full bg-green-600 hover:bg-green-500 transition-colors"
        >
          <Plus size={18} />
        </button>
      }
    >
      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400 px-6">
          <AlertCircle size={48} className="text-gray-300" />
          <p className="text-center text-sm">{t('home.noReptiles')}</p>
          <button
            onClick={() => navigate('/reptile/new')}
            className="bg-green-600 text-white px-6 py-2 rounded-full text-sm font-medium"
          >
            {t('home.addFirst')}
          </button>
        </div>
      ) : (
        <>
          <Section title={t('home.overview')}>
            <div className="px-4 space-y-3">
              {cards.map(({ reptile, lastFeed, pendingMeds }) => (
                <Card key={reptile.id} onClick={() => navigate(`/reptile/${reptile.id}`)}>
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                      {reptile.photoUrl ? (
                        <img src={reptile.photoUrl} alt={reptile.name} className="w-full h-full object-cover" />
                      ) : (
                        '🦎'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{reptile.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {reptile.species}{reptile.breed && ` · ${reptile.breed}`}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock size={11} className="text-gray-400" />
                        <span className="text-xs text-gray-400">
                          {t('home.lastFed', { time: formatRelativeTime(lastFeed?.fedAt) })}
                        </span>
                      </div>
                    </div>
                    {pendingMeds.length > 0 && (
                      <div className="shrink-0">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                          {pendingMeds.length}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </Section>

          {todos.length > 0 && (
            <Section title={t('home.todayTodosCount', { count: pendingTodos.length })}>
              <Card className="mx-4">
                {pendingTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    item={todo}
                    reptileName={todo.reptileId ? reptileMap.get(todo.reptileId) : undefined}
                    onUpdate={load}
                  />
                ))}
                {pendingTodos.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-4">{t('home.allDone')}</p>
                )}
                {doneTodos.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400 font-medium">{t('home.handled')}</div>
                    {doneTodos.map((todo) => (
                      <TodoItem
                        key={todo.id}
                        item={todo}
                        reptileName={todo.reptileId ? reptileMap.get(todo.reptileId) : undefined}
                        onUpdate={load}
                      />
                    ))}
                  </>
                )}
              </Card>
            </Section>
          )}
        </>
      )}
    </Layout>
  )
}
