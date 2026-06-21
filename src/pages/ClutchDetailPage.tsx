import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Egg, Trash2, Pencil } from 'lucide-react'
import { Layout } from '../components/Layout'
import { InputField, TextareaField } from '../components/FormField'
import { clutchLogRepo, reptileRepo } from '../db/repos'
import type { ClutchLog, Reptile } from '../db/schema'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysFromNow(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export function ClutchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [clutch, setClutch] = useState<ClutchLog | null>(null)
  const [father, setFather] = useState<Reptile | undefined>()
  const [mother, setMother] = useState<Reptile | undefined>()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    hatchedCount: '',
    moldedCount: '',
    notes: '',
  })

  const load = useCallback(async () => {
    if (!id) return
    const all = await clutchLogRepo.getAll()
    const found = all.find((c) => c.id === id)
    if (!found) { navigate('/breeding', { replace: true }); return }
    setClutch(found)
    setForm({
      hatchedCount: found.hatchedCount != null ? String(found.hatchedCount) : '',
      moldedCount: found.moldedCount != null ? String(found.moldedCount) : '',
      notes: found.notes ?? '',
    })
    const reptiles = await reptileRepo.getAll()
    const rMap = new Map(reptiles.map((r) => [r.id, r]))
    setFather(found.fatherReptileId ? rMap.get(found.fatherReptileId) : undefined)
    setMother(found.motherReptileId ? rMap.get(found.motherReptileId) : undefined)
  }, [id, navigate])

  useEffect(() => { void load() }, [load])

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }))
    }

  const handleSave = async () => {
    if (!clutch) return
    setSaving(true)
    await clutchLogRepo.update(clutch.id, {
      hatchedCount: form.hatchedCount !== '' ? Number(form.hatchedCount) : undefined,
      moldedCount: form.moldedCount !== '' ? Number(form.moldedCount) : undefined,
      notes: form.notes.trim() || undefined,
    })
    await load()
    setSaving(false)
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!clutch) return
    if (!window.confirm(t('clutch.deleteConfirm'))) return
    await clutchLogRepo.delete(clutch.id)
    navigate('/breeding', { replace: true })
  }

  if (!clutch) return null

  const milestones = [
    { label: t('clutch.candlingDay'), date: addDays(clutch.date, 14) },
    { label: t('clutch.hydrationDay'), date: addDays(clutch.date, 30) },
    { label: t('clutch.expectedHatchDay'), date: addDays(clutch.date, 60) },
  ]
  const isHatched = clutch.hatchedCount != null && clutch.hatchedCount > 0

  return (
    <Layout
      title={t('clutch.detail')}
      back="/breeding"
    >
      <div className="px-4 pt-4 pb-8 space-y-4">

        {/* Parents card */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {father?.photoUrl ? (
                <img src={father.photoUrl} alt={father.name} className="w-12 h-12 rounded-full border-2 border-surface-container-lowest object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full border-2 border-surface-container-lowest bg-surface-container flex items-center justify-center">
                  <Egg size={18} className="text-on-surface-variant" />
                </div>
              )}
              {mother?.photoUrl ? (
                <img src={mother.photoUrl} alt={mother.name} className="w-12 h-12 rounded-full border-2 border-surface-container-lowest object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full border-2 border-surface-container-lowest bg-surface-container flex items-center justify-center">
                  <Egg size={18} className="text-on-surface-variant" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-on-surface">
                {father?.name ?? t('clutch.unset')} × {mother?.name ?? t('clutch.unset')}
              </p>
              {(father?.breed || mother?.breed) && (
                <p className="text-xs text-on-surface-variant italic truncate">
                  {[father?.breed, mother?.breed].filter(Boolean).join(' × ')}
                </p>
              )}
              <p className="text-xs text-on-surface-variant mt-0.5">{clutch.date}</p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
            <p className="text-xs text-on-surface-variant mb-1">{t('clutch.eggCount')}</p>
            <p className="text-2xl font-bold text-primary">{clutch.eggCount}</p>
          </div>
          {clutch.fertileCount != null && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
              <p className="text-xs text-on-surface-variant mb-1">{t('clutch.fertileCount')}</p>
              <p className="text-2xl font-bold text-secondary">{clutch.fertileCount}</p>
            </div>
          )}
          {clutch.hatchedCount != null && (
            <div className="bg-primary-container rounded-xl p-4">
              <p className="text-xs text-on-primary-container mb-1">{t('clutch.hatchedCount')}</p>
              <p className="text-2xl font-bold text-on-primary-container">{clutch.hatchedCount}</p>
            </div>
          )}
          {clutch.moldedCount != null && (
            <div className="bg-error-container rounded-xl p-4">
              <p className="text-xs text-on-error-container mb-1">{t('clutch.moldedCount')}</p>
              <p className="text-2xl font-bold text-on-error-container">{clutch.moldedCount}</p>
            </div>
          )}
        </section>

        {/* Milestones (only if not hatched) */}
        {!isHatched && (
          <section className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
            <h3 className="text-xs font-semibold text-on-surface-variant tracking-wide mb-3">
              {t('clutch.inProgress')}
            </h3>
            <div className="space-y-2">
              {milestones.map((m) => {
                const diff = daysFromNow(m.date)
                const isPast = diff < 0
                const isToday = diff === 0
                return (
                  <div key={m.label} className="flex justify-between items-center">
                    <p className={`text-sm ${isPast ? 'text-on-surface-variant line-through' : 'text-on-surface font-medium'}`}>
                      {m.label}
                    </p>
                    <span className={`text-xs font-semibold ${isToday ? 'text-primary' : isPast ? 'text-on-surface-variant' : 'text-secondary'}`}>
                      {isToday ? '今天' : isPast ? `${Math.abs(diff)} 天前` : `${diff} 天後`}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Notes (read mode) */}
        {!editing && clutch.notes && (
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
            <p className="text-xs font-semibold text-on-surface-variant mb-1">{t('clutch.notes')}</p>
            <p className="text-sm text-on-surface whitespace-pre-wrap">{clutch.notes}</p>
          </section>
        )}

        {/* Edit outcome section */}
        {editing ? (
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-on-surface">{t('clutch.updateOutcome')}</h3>
            <InputField
              label={t('clutch.hatchedCount')}
              type="number"
              min={0}
              value={form.hatchedCount}
              onChange={set('hatchedCount')}
            />
            <InputField
              label={t('clutch.moldedCount')}
              type="number"
              min={0}
              value={form.moldedCount}
              onChange={set('moldedCount')}
            />
            <TextareaField
              label={t('clutch.notesLabel')}
              value={form.notes}
              onChange={set('notes')}
              rows={3}
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2 rounded-lg border border-outline-variant text-sm text-on-surface-variant font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold disabled:opacity-50"
              >
                {saving ? '…' : t('common.save')}
              </button>
            </div>
          </section>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-outline-variant text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
            >
              <Pencil size={14} />
              {t('common.edit')}
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-error/40 text-sm font-medium text-error hover:bg-error-container transition-colors"
            >
              <Trash2 size={14} />
              {t('common.delete')}
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
