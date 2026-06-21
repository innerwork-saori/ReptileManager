import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { Card } from '../components/Card'
import { InputField, SelectField } from '../components/FormField'
import { todoRuleRepo, reptileRepo } from '../db/repos'
import type { TodoRule, TodoRuleType, ScheduleType } from '../db/schema'
import type { Reptile } from '../db/schema'

interface RuleWithReptile extends TodoRule {
  reptileName: string
}

export function TodosPage() {
  const { t } = useTranslation()
  const [rules, setRules] = useState<RuleWithReptile[]>([])
  const [reptiles, setReptiles] = useState<Reptile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    reptileId: '',
    type: 'feeding' as TodoRuleType,
    label: '',
    scheduleType: 'fixed_daily' as ScheduleType,
    time: '08:00',
    weekDays: [] as number[],
    intervalDays: '1',
  })

  const RULE_TYPE_OPTIONS: { value: TodoRuleType; label: string }[] = [
    { value: 'feeding',   label: t('todo.types.feeding') },
    { value: 'medication', label: t('todo.types.medication') },
    { value: 'cleaning',  label: t('todo.types.cleaning') },
    { value: 'weight',    label: t('todo.types.weight') },
    { value: 'uvb_check', label: t('todo.types.uvb_check') },
    { value: 'substrate', label: t('todo.types.substrate') },
    { value: 'shed_check', label: t('todo.types.shed_check') },
    { value: 'custom',    label: t('todo.types.custom') },
  ]

  const SCHEDULE_TYPE_OPTIONS: { value: ScheduleType; label: string }[] = [
    { value: 'fixed_daily',   label: t('todo.schedules.fixed_daily') },
    { value: 'fixed_weekly',  label: t('todo.schedules.fixed_weekly') },
    { value: 'interval_days', label: t('todo.schedules.interval_days') },
  ]

  const DAY_LABELS: string[] = t('todo.days', { returnObjects: true }) as string[]

  const load = useCallback(async () => {
    const [allRules, allReptiles] = await Promise.all([
      todoRuleRepo.getAll(),
      reptileRepo.getAll(),
    ])
    setReptiles(allReptiles)
    const reptileMap = new Map(allReptiles.map((r) => [r.id, r.name]))
    const enriched = allRules.map((rule) => ({
      ...rule,
      reptileName: rule.reptileId ? (reptileMap.get(rule.reptileId) ?? '?') : t('todo.globalRule'),
    }))
    setRules(enriched)
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load() }, [load])

  const typeLabel = (type: TodoRuleType) =>
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
      weekDays: f.weekDays.includes(day)
        ? f.weekDays.filter((d) => d !== day)
        : [...f.weekDays, day].sort(),
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const config: Record<string, unknown> =
      form.scheduleType === 'fixed_daily'   ? { time: form.time } :
      form.scheduleType === 'fixed_weekly'  ? { days: form.weekDays, time: form.time } :
      { intervalDays: Number(form.intervalDays) }

    const label = form.label.trim() || typeLabel(form.type)

    await todoRuleRepo.create({
      reptileId: form.reptileId || undefined,
      type: form.type,
      label,
      scheduleType: form.scheduleType,
      config,
      enabled: true,
    })

    setForm((f) => ({
      ...f,
      type: 'feeding',
      label: '',
      scheduleType: 'fixed_daily',
      time: '08:00',
      weekDays: [],
      intervalDays: '1',
    }))
    setShowForm(false)
    await load()
    setSaving(false)
  }

  const reptileOptions = [
    { value: '', label: t('todo.noReptile') },
    ...reptiles.map((r) => ({ value: r.id, label: r.name })),
  ]

  return (
    <Layout title={t('nav.todos')}>
      {/* Add button */}
      <div className="px-4 pt-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-xl text-sm font-semibold"
        >
          <Plus size={16} />
          {showForm ? t('todo.cancelRule') : t('todo.addRule')}
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <form onSubmit={handleSave} className="mx-4 mt-3 bg-primary-container/20 rounded-xl p-4 space-y-3 border border-primary-container">
          <SelectField
            label={t('todo.reptileLabel')}
            value={form.reptileId}
            onChange={(e) => setForm((f) => ({ ...f, reptileId: e.target.value }))}
            options={reptileOptions}
          />
          <SelectField
            label={t('todo.ruleTypeLabel')}
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TodoRuleType }))}
            options={RULE_TYPE_OPTIONS}
          />
          <InputField
            label={t('todo.labelField')}
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder={t('todo.labelPlaceholder')}
          />
          <SelectField
            label={t('todo.scheduleTypeLabel')}
            value={form.scheduleType}
            onChange={(e) => setForm((f) => ({ ...f, scheduleType: e.target.value as ScheduleType }))}
            options={SCHEDULE_TYPE_OPTIONS}
          />
          {(form.scheduleType === 'fixed_daily' || form.scheduleType === 'fixed_weekly') && (
            <InputField
              label={t('todo.timeLabel')}
              type="time"
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
            />
          )}
          {form.scheduleType === 'fixed_weekly' && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-on-surface">{t('todo.weekdaysLabel')}</label>
              <div className="flex gap-2">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                      form.weekDays.includes(i)
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container border border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {form.scheduleType === 'interval_days' && (
            <InputField
              label={t('todo.intervalDaysLabel')}
              type="number"
              min="1"
              value={form.intervalDays}
              onChange={(e) => setForm((f) => ({ ...f, intervalDays: e.target.value }))}
            />
          )}
          <button
            type="submit"
            disabled={saving || !form.reptileId}
            className="w-full bg-primary text-on-primary py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            {saving ? t('common.saving') : t('todo.saveBtn')}
          </button>
        </form>
      )}

      {/* Rules list */}
      <div className="px-4 mt-4 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-on-surface-variant text-sm">
            {t('common.loading')}
          </div>
        ) : rules.length === 0 ? (
          <p className="text-center text-on-surface-variant text-sm py-12">{t('todo.noRules')}</p>
        ) : (
          <Card>
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant last:border-0">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${rule.enabled ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                    {rule.label}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    <span className="text-primary font-medium">{rule.reptileName}</span>
                    {' · '}{typeLabel(rule.type)}{' · '}{scheduleLabel(rule)}
                  </p>
                </div>
                <button onClick={() => todoRuleRepo.update(rule.id, { enabled: !rule.enabled }).then(load)} className="shrink-0 text-on-surface-variant">
                  {rule.enabled
                    ? <ToggleRight size={24} className="text-primary" />
                    : <ToggleLeft size={24} />}
                </button>
                <button
                  onClick={() => todoRuleRepo.delete(rule.id).then(load)}
                  className="shrink-0 p-1.5 text-on-surface-variant hover:text-error transition-colors"
                >
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
