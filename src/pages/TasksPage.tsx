import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, SkipForward, ClipboardList } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { Card } from '../components/Card'
import { todoRuleRepo, todoInstanceRepo, reptileRepo } from '../db/repos'
import { computeTodayInstances } from '../lib/todoEngine'
import type { TodoInstance, TodoRuleType } from '../db/schema'

interface InstanceWithReptile extends TodoInstance {
  reptileName: string
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

const TYPE_ICON: Record<TodoRuleType | 'custom', string> = {
  feeding: '🍖',
  medication: '💊',
  cleaning: '🧹',
  weight: '⚖️',
  uvb_check: '💡',
  substrate: '🪵',
  shed_check: '🐍',
  custom: '📌',
}

export function TasksPage() {
  const { t } = useTranslation()
  const [pending, setPending] = useState<InstanceWithReptile[]>([])
  const [done, setDone] = useState<InstanceWithReptile[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [rules, existingInstances, reptiles] = await Promise.all([
      todoRuleRepo.getAll(),
      todoInstanceRepo.getByDate(todayStr()),
      reptileRepo.getAll(),
    ])
    const reptileMap = new Map(reptiles.map((r) => [r.id, r.name]))
    const instances = computeTodayInstances(rules, existingInstances)
    await todoInstanceRepo.upsertMany(instances)

    const enrich = (list: TodoInstance[]): InstanceWithReptile[] =>
      list.map((i) => ({
        ...i,
        reptileName: i.reptileId ? (reptileMap.get(i.reptileId) ?? '?') : t('todo.noReptile'),
      }))

    setPending(enrich(instances.filter((i) => i.status === 'pending')))
    setDone(enrich(instances.filter((i) => i.status !== 'pending')))
    setLoading(false)
  }, [t])

  useEffect(() => { void load() }, [load])

  const handleDone = async (id: string) => {
    await todoInstanceRepo.updateStatus(id, 'done')
    await load()
  }

  const handleSkip = async (id: string) => {
    await todoInstanceRepo.updateStatus(id, 'skipped')
    await load()
  }

  const total = pending.length + done.length
  const completedCount = done.length
  const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0

  return (
    <Layout title={t('tasks.title')}>
      <div className="px-4 pt-4 pb-6 space-y-4">

        {/* Progress overview */}
        {total > 0 && (
          <div className="bg-primary-container text-on-primary-container p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-sm">{t('tasks.overview')}</span>
              <span className="text-xs">{t('tasks.progress', { done: completedCount, total, percent })}</span>
            </div>
            <div className="w-full bg-black/10 rounded-full h-2 mb-2">
              <div
                className="bg-on-primary-container h-2 rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs opacity-80">
              {pending.length === 0
                ? t('tasks.allDone')
                : t('tasks.remaining', { count: pending.length })}
            </p>
          </div>
        )}

        {/* Pending tasks */}
        {loading ? (
          <div className="flex justify-center py-16 text-on-surface-variant text-sm">{t('common.loading')}</div>
        ) : pending.length === 0 && done.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-on-surface-variant">
            <ClipboardList size={48} className="opacity-30" />
            <p className="text-sm">{t('tasks.noTasks')}</p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div>
                <h2 className="font-semibold text-sm text-on-surface mb-2 flex items-center gap-2">
                  {t('tasks.pendingSection')}
                  <span className="bg-error-container text-on-error-container text-xs font-bold px-2 py-0.5 rounded-full">
                    {pending.length}
                  </span>
                </h2>
                <Card>
                  {pending.map((item) => (
                    <div key={item.id} className="px-4 py-3 border-b border-outline-variant last:border-0">
                      <div className="flex items-center gap-3 mb-2.5">
                        <span className="text-2xl">{TYPE_ICON[item.type] ?? TYPE_ICON.custom}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-on-surface leading-snug">{item.label}</p>
                          <p className="text-xs text-on-surface-variant">
                            {item.reptileName}
                            {item.dueAt && (
                              <span className="ml-1">· {new Date(item.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDone(item.id)}
                          className="flex-[2] flex items-center justify-center gap-1.5 bg-primary text-on-primary py-2 rounded-lg text-xs font-semibold active:scale-95 transition-transform"
                        >
                          <CheckCircle2 size={14} />
                          {t('tasks.markDone')}
                        </button>
                        <button
                          onClick={() => handleSkip(item.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 border border-outline-variant text-on-surface-variant py-2 rounded-lg text-xs font-semibold active:scale-95 transition-transform"
                        >
                          <SkipForward size={14} />
                          {t('tasks.skip')}
                        </button>
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {/* Completed tasks */}
            {done.length > 0 && (
              <div className="opacity-60">
                <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                  {t('tasks.doneSection', { count: done.length })}
                </h3>
                <Card>
                  {done.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant last:border-0">
                      <CheckCircle2 size={18} className={item.status === 'done' ? 'text-primary shrink-0' : 'text-on-surface-variant shrink-0'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-on-surface line-through leading-snug">{item.label}</p>
                        <p className="text-xs text-on-surface-variant">
                          {item.reptileName} · {item.status === 'done' ? t('todoItem.done') : t('todoItem.skipped')}
                        </p>
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
