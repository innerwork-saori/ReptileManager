import i18n from '../i18n'
import type { TodoRule, TodoInstance, TodoRuleType } from '../db/schema'

export type { TodoRuleType }

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function dayOfWeek(): number {
  return new Date().getDay()
}

function isoDateToday(time: string): string {
  const today = todayStr()
  return `${today}T${time}:00`
}

function generateId(ruleId: string, reptileId: string | null, date: string): string {
  return `todo_${ruleId}_${reptileId ?? 'global'}_${date}`
}

export function computeTodayInstances(
  rules: TodoRule[],
  existingInstances: TodoInstance[],
): TodoInstance[] {
  const today = todayStr()
  const dow = dayOfWeek()
  const t = new Date().toISOString()

  const existingMap = new Map(existingInstances.map((i) => [i.id, i]))
  const result: TodoInstance[] = []

  for (const rule of rules) {
    if (!rule.enabled) continue

    let shouldCreate = false
    let dueAt: string | undefined

    if (rule.scheduleType === 'fixed_daily') {
      shouldCreate = true
      const time = (rule.config as { time?: string }).time
      if (time) dueAt = isoDateToday(time)
    } else if (rule.scheduleType === 'fixed_weekly') {
      const days = (rule.config as { days?: number[]; time?: string }).days ?? []
      if (days.includes(dow)) {
        shouldCreate = true
        const time = (rule.config as { days?: number[]; time?: string }).time
        if (time) dueAt = isoDateToday(time)
      }
    } else if (rule.scheduleType === 'interval_days') {
      const intervalDays = (rule.config as { intervalDays?: number; lastDoneAt?: string }).intervalDays ?? 1
      const lastDoneAt = (rule.config as { intervalDays?: number; lastDoneAt?: string }).lastDoneAt
      if (!lastDoneAt) {
        shouldCreate = true
      } else {
        const last = new Date(lastDoneAt)
        const diff = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24)
        if (diff >= intervalDays) shouldCreate = true
      }
    }

    if (!shouldCreate) continue

    const id = generateId(rule.id, rule.reptileId, today)
    if (existingMap.has(id)) {
      result.push(existingMap.get(id)!)
    } else {
      const instance: TodoInstance = {
        id,
        reptileId: rule.reptileId,
        ruleId: rule.id,
        date: today,
        dueAt,
        status: 'pending',
        type: rule.type as TodoRuleType,
        label: rule.label,
        createdAt: t,
        updatedAt: t,
      }
      result.push(instance)
    }
  }

  return result
}

export function formatRelativeTime(isoString: string | undefined): string {
  const t = i18n.t.bind(i18n)
  if (!isoString) return t('common.notRecorded')
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return t('common.daysAgo', { count: days })
  if (hours > 0) return t('common.hoursAgo', { count: hours })
  if (mins > 0) return t('common.minutesAgo', { count: mins })
  return t('common.justNow')
}

export function formatRelativeTimeInDays(isoString: string | undefined): string {
  const t = i18n.t.bind(i18n)
  if (!isoString) return t('common.notRecorded')
  const diff = Date.now() - new Date(isoString).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  return t('common.daysAgo', { count: days })
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function calcAge(birthDate: string | undefined): string {
  if (!birthDate) return '—'
  const parts = birthDate.split('-')
  const now = new Date()
  if (parts.length === 1) {
    const y = now.getFullYear() - parseInt(parts[0])
    return `${y} 歲`
  }
  // For YYYY-MM, treat as first day of that month to calculate months correctly
  const birth = new Date(parts.length === 2 ? `${birthDate}-01` : birthDate)
  const years = now.getFullYear() - birth.getFullYear()
  const months = now.getMonth() - birth.getMonth()
  const totalMonths = years * 12 + months
  if (totalMonths < 12) return `${totalMonths} 個月`
  const y = Math.floor(totalMonths / 12)
  const m = totalMonths % 12
  return m > 0 ? `${y} 歲 ${m} 個月` : `${y} 歲`
}
