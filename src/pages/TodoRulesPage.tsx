import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { Card } from '../components/Card'
import { InputField, SelectField } from '../components/FormField'
import { todoRuleRepo, reptileRepo } from '../db/repos'
import type { TodoRule, TodoRuleType, ScheduleType } from '../db/schema'

export function TodoRulesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [reptileName, setReptileName] = useState('')
  const [rules, setRules] = useState<TodoRule[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    type: 'feeding' as TodoRuleType,
    label: '',
    scheduleType: 'fixed_daily' as ScheduleType,
    time: '08:00',
    weekDays: [] as number[],
    intervalDays: '1',
  })
  const [saving, setSaving] = useState(false)

  const RULE_TYPE_OPTIONS: { value: TodoRuleType; label: string }[] = [
    { value: 'feeding', label: t('todo.types.feeding') },
    { value: 'medication', label: t('todo.types.medication') },
    { value: 'cleaning', label: t('todo.types.cleaning') },
    { value: 'weight', label: t('todo.types.weight') },
    { value: 'uvb_check', label: t('todo.types.uvb_check') },
    { value: 'substrate', label: t('todo.types.substrate') },
    { value: 'shed_check', label: t('todo.types.shed_check') },
    { value: 'custom', label: t('todo.types.custom') },
  ]

  const SCHEDULE_TYPE_OPTIONS: { value: ScheduleType; label: string }[] = [
    { value: 'fixed_daily', label: t('todo.schedules.fixed_daily') },
    { value: 'fixed_weekly', label: t('todo.schedules.fixed_weekly') },
    { value: 'interval_days', label: t('todo.schedules.interval_days') },
  ]

  const DAY_LABELS: string[] = t('todo.days', { returnObjects: true }) as string[]

  const load = useCallback(async () => {
    if (!id) return
    const [r, allRules] = await Promise.all([reptileRepo.getById(id), todoRuleRepo.getAll()])
    if (!r) { navigate('/reptiles'); return }
    setReptileName(r.name)
    setRules(allRules.filter((rule) => rule.reptileId === id || rule.reptileId === null))
  }, [id, navigate])

  useEffect(() => { void load() }, [load])

  const typeLabel = (type: TodoRuleType): string =>
    RULE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type

  const scheduleLabel = (rule: TodoRule): string => {
    if (rule.scheduleType === 'fixed_daily') {
      const time = (rule.config as { time?: string }).time
      return time ? t('todo.scheduleDaily', { time }) : t('todo.scheduleDailyNoTime')
    }
    if (rule.scheduleType === 'fixed_weekly') {
      const days = (rule.config as { days?: number[]; time?: string }).days ?? []
      const time = (rule.config as { days?: number[]; time?: string }).time
      const dayStr = days.map((d) => DAY_LABELS[d]).join('、')
      return time ? t('todo.scheduleWeekly', { days: dayStr, time }) : t('todo.scheduleWeeklyNoTime', { days: dayStr })
    }
    if (rule.scheduleType === 'interval_days') {
      const n = (rule.config as { intervalDays?: number }).intervalDays ?? 1
      return t('todo.scheduleInterval', { n })
    }
    return rule.scheduleType
  }

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      weekDays: f.weekDays.includes(day) ? f.weekDays.filter((d) => d !== day) : [...f.weekDays, day].sort(),
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setSaving(true)

    const config: Record<string, unknown> =
      form.scheduleType === 'fixed_daily' ? { time: form.time } :
      form.scheduleType === 'fixed_weekly' ? { days: form.weekDays, time: form.time } :
      { intervalDays: Number(form.intervalDays) }

    const label = form.label.trim() || typeLabel(form.type)

    await todoRuleRepo.create({
      reptileId: id,
      type: form.type,
      label,
      scheduleType: form.scheduleType,
      config,
      enabled: true,
    })

    setForm({ type: 'feeding', label: '', scheduleType: 'fixed_daily', time: '08:00', weekDays: [], intervalDays: '1' })
    setShowForm(false)
    await load()
    setSaving(false)
  }

  const toggleEnabled = async (rule: TodoRule) => {
    await todoRuleRepo.update(rule.id, { enabled: !rule.enabled })
    await load()
  }

  return (
    <Layout title={`${reptileName} · ${t('todo.title')}`} back={`/reptile/${id}`}>
      <div className="px-4 pt-4">
        <button onClick={() => setShowForm(!showForm)}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium">
          <Plus size={16} />
          {showForm ? t('todo.cancelRule') : t('todo.addRule')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="mx-4 mt-3 bg-green-50 rounded-xl p-4 space-y-3">
          <SelectField
            label={t('todo.ruleTypeLabel')}
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TodoRuleType }))}
            options={RULE_TYPE_OPTIONS}
          />
          <InputField label={t('todo.labelField')} value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder={t('todo.labelPlaceholder')} />
          <SelectField
            label={t('todo.scheduleTypeLabel')}
            value={form.scheduleType}
            onChange={(e) => setForm((f) => ({ ...f, scheduleType: e.target.value as ScheduleType }))}
            options={SCHEDULE_TYPE_OPTIONS}
          />
          {(form.scheduleType === 'fixed_daily' || form.scheduleType === 'fixed_weekly') && (
            <InputField label={t('todo.timeLabel')} type="time" value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
          )}
          {form.scheduleType === 'fixed_weekly' && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">{t('todo.weekdaysLabel')}</label>
              <div className="flex gap-2">
                {DAY_LABELS.map((label, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                      form.weekDays.includes(i)
                        ? 'bg-green-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-600'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {form.scheduleType === 'interval_days' && (
            <InputField label={t('todo.intervalDaysLabel')} type="number" min="1" value={form.intervalDays}
              onChange={(e) => setForm((f) => ({ ...f, intervalDays: e.target.value }))} />
          )}
          <button type="submit" disabled={saving || (form.scheduleType === 'fixed_weekly' && form.weekDays.length === 0)}
            className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
            {saving ? t('common.saving') : t('todo.saveBtn')}
          </button>
        </form>
      )}

      <div className="px-4 mt-4">
        {rules.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">{t('todo.noRules')}</p>
        ) : (
          <Card>
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${rule.enabled ? 'text-gray-800' : 'text-gray-400'}`}>
                    {rule.label}
                  </p>
                  <p className="text-xs text-gray-400">{typeLabel(rule.type)} · {scheduleLabel(rule)}</p>
                  {!rule.reptileId && <span className="text-xs text-blue-500">{t('todo.globalRule')}</span>}
                </div>
                <button onClick={() => toggleEnabled(rule)} className="shrink-0 text-gray-400">
                  {rule.enabled
                    ? <ToggleRight size={24} className="text-green-600" />
                    : <ToggleLeft size={24} />}
                </button>
                <button onClick={() => todoRuleRepo.delete(rule.id).then(load)}
                  className="shrink-0 p-1.5 text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </Card>
        )}
      </div>
    </Layout>
  )
}
