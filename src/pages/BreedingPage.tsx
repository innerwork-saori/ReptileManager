import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Egg, Plus, Trash2, X, ChevronRight } from 'lucide-react'
import { Layout } from '../components/Layout'
import { InputField, SelectField, TextareaField } from '../components/FormField'
import { clutchLogRepo, reptileRepo } from '../db/repos'
import type { ClutchLog, Reptile } from '../db/schema'

const SEX_LABEL: Record<string, string> = { male: '公', female: '母', unknown: '未知' }

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

export function BreedingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [clutches, setClutches] = useState<ClutchLog[]>([])
  const [reptiles, setReptiles] = useState<Reptile[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    fatherReptileId: '',
    motherReptileId: '',
    eggCount: '',
    fertileCount: '',
    notes: '',
  })

  const load = useCallback(async () => {
    const [c, r] = await Promise.all([clutchLogRepo.getAll(), reptileRepo.getAll()])
    setClutches(c)
    setReptiles(r)
  }, [])

  useEffect(() => { void load() }, [load])

  const reptileMap = useMemo(
    () => new Map(reptiles.map((r) => [r.id, r])),
    [reptiles]
  )

  const reptileOptions = [
    { value: '', label: t('clutch.unset') },
    ...reptiles.map((r) => ({
      value: r.id,
      label: `${r.name}${r.sex ? ` (${SEX_LABEL[r.sex] ?? r.sex})` : ''}`,
    })),
  ]

  const completedClutches = clutches.filter((c) => c.hatchedCount != null && c.hatchedCount > 0)
  const totalEggs = completedClutches.reduce((s, c) => s + c.eggCount, 0)
  const totalHatched = completedClutches.reduce((s, c) => s + (c.hatchedCount ?? 0), 0)
  const hatchRate = totalEggs > 0 ? Math.round((totalHatched / totalEggs) * 100) : 0

  const today = new Date().toISOString().slice(0, 10)
  const thisMonthCount = useMemo(() => {
    const ym = today.slice(0, 7)
    return clutches.filter((c) => c.date.startsWith(ym)).length
  }, [clutches, today])

  const inProgressClutches = useMemo(
    () =>
      clutches
        .filter((c) => !c.hatchedCount && c.date <= today)
        .map((c) => {
          const milestones = [
            { label: t('clutch.candlingDay'), date: addDays(c.date, 14) },
            { label: t('clutch.hydrationDay'), date: addDays(c.date, 30) },
            { label: t('clutch.expectedHatchDay'), date: addDays(c.date, 60) },
          ]
          const next = milestones
            .filter((m) => m.date >= today)
            .sort((a, b) => a.date.localeCompare(b.date))[0]
          const mother = c.motherReptileId ? reptileMap.get(c.motherReptileId) : undefined
          return { clutch: c, next, mother }
        })
        .filter((item) => item.next),
    [clutches, today, reptileMap, t]
  )

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }))
    }

  const adjustEgg = (delta: number) => {
    setForm((f) => {
      const next = Math.max(0, (Number(f.eggCount) || 0) + delta)
      return { ...f, eggCount: String(next) }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.eggCount || Number(form.eggCount) < 0) return
    setSaving(true)
    await clutchLogRepo.create({
      date: form.date,
      fatherReptileId: form.fatherReptileId || undefined,
      motherReptileId: form.motherReptileId || undefined,
      eggCount: Number(form.eggCount),
      fertileCount: form.fertileCount ? Number(form.fertileCount) : undefined,
      notes: form.notes.trim() || undefined,
    })
    setForm({
      date: new Date().toISOString().slice(0, 10),
      fatherReptileId: '',
      motherReptileId: '',
      eggCount: '',
      fertileCount: '',
      notes: '',
    })
    await load()
    setSaving(false)
    setTimeout(() => {
      setModalOpen(false)
    }, 1000)
  }

  const handleDelete = async (id: string) => {
    await clutchLogRepo.delete(id)
    await load()
  }

  return (
    <>
      <Layout title={t('nav.breeding')}>
        <div className="px-4 pt-4 pb-8 space-y-4">

          {/* Stats Bento */}
          <section className="grid grid-cols-2 gap-3">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-on-surface-variant mb-2">
                <Egg size={16} className="text-primary" />
                <span className="text-xs font-semibold tracking-wide">{t('clutch.totalClutches')}</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary leading-tight">{clutches.length}</p>
                {thisMonthCount > 0 && (
                  <p className="text-xs text-secondary font-semibold mt-0.5">
                    {t('clutch.thisMonth', { count: thisMonthCount })}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-primary-container rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center gap-1.5 text-on-primary-container mb-2">
                <span className="text-xs font-semibold tracking-wide">{t('clutch.hatchRate')}</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-on-primary-container leading-tight">
                  {totalEggs > 0 ? `${hatchRate}%` : '—'}
                </p>
                {totalEggs > 0 && (
                  <div className="w-full bg-on-primary-container/20 h-1.5 rounded-full mt-2">
                    <div
                      className="bg-on-primary-container h-full rounded-full transition-all"
                      style={{ width: `${hatchRate}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="absolute -right-3 -bottom-3 w-12 h-12 bg-on-primary-container/10 rounded-full blur-xl" />
            </div>
          </section>

          {/* In Incubation Tasks */}
          {inProgressClutches.length > 0 && (
            <section className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
              <h3 className="text-xs font-semibold text-on-surface-variant tracking-wide mb-3">
                {t('clutch.inProgress')}
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {inProgressClutches.map(({ clutch, next, mother }) => {
                  const diff = daysFromNow(next!.date)
                  return (
                    <div
                      key={clutch.id}
                      className="min-w-[140px] bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col gap-1 shrink-0"
                    >
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wide">
                        {diff === 0 ? '今天' : diff > 0 ? `${diff} 天後` : `${Math.abs(diff)} 天前`}
                      </span>
                      <p className="text-xs font-bold text-on-surface leading-tight">{next!.label}</p>
                      {mother && (
                        <p className="text-[10px] text-on-surface-variant">{mother.name}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Clutch List */}
          <section>
            <h2 className="text-base font-semibold text-on-surface mb-3">
              {t('clutch.title')}
            </h2>

            {clutches.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-10">
                {t('clutch.noRecords')}
              </p>
            ) : (
              <div className="space-y-3">
                {clutches.map((c) => {
                  const father = c.fatherReptileId ? reptileMap.get(c.fatherReptileId) : undefined
                  const mother = c.motherReptileId ? reptileMap.get(c.motherReptileId) : undefined
                  return (
                    <div
                      key={c.id}
                      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs font-semibold text-on-surface-variant">{c.date}</p>
                          <p className="text-lg font-bold text-primary mt-0.5">
                            {c.eggCount}
                            <span className="text-xs font-normal text-on-surface-variant ml-1">
                              {t('clutch.eggCountUnit')}
                            </span>
                            {c.fertileCount != null && (
                              <span className="text-xs font-normal text-secondary ml-2">
                                {c.fertileCount} {t('clutch.fertileCount')}
                              </span>
                            )}
                          </p>
                          {c.hatchedCount != null && (
                            <p className="text-xs text-primary font-semibold">
                              {c.hatchedCount} {t('clutch.hatchedCount')}
                            </p>
                          )}
                          {c.moldedCount != null && (
                            <p className="text-xs text-error font-semibold">
                              {c.moldedCount} {t('clutch.moldedCount')}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div
                        className="flex items-center gap-3 pt-3 border-t border-outline-variant/30 cursor-pointer active:bg-surface-container/50 transition-colors rounded-b-lg -mx-1 px-1"
                        onClick={() => navigate(`/breeding/${c.id}`)}
                      >
                        <div className="flex -space-x-2">
                          {father?.photoUrl && (
                            <img
                              src={father.photoUrl}
                              alt={father.name}
                              className="w-8 h-8 rounded-full border-2 border-surface-container-lowest object-cover"
                            />
                          )}
                          {mother?.photoUrl && (
                            <img
                              src={mother.photoUrl}
                              alt={mother.name}
                              className="w-8 h-8 rounded-full border-2 border-surface-container-lowest object-cover"
                            />
                          )}
                          {!father?.photoUrl && !mother?.photoUrl && (
                            <div className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-surface-container flex items-center justify-center">
                              <Egg size={14} className="text-on-surface-variant" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-on-surface truncate">
                            {father ? father.name : t('clutch.unset')} × {mother ? mother.name : t('clutch.unset')}
                          </p>
                          {(father?.breed || mother?.breed) && (
                            <p className="text-xs text-on-surface-variant truncate italic">
                              {[father?.breed, mother?.breed].filter(Boolean).join(' × ')}
                            </p>
                          )}
                          {c.notes && (
                            <p className="text-xs text-on-surface-variant truncate">{c.notes}</p>
                          )}
                        </div>
                        <ChevronRight size={16} className="text-outline shrink-0" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </Layout>

      {/* FAB */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-50"
        aria-label={t('clutch.addRecord')}
      >
        <Plus size={24} />
      </button>

      {/* Bottom Sheet Modal */}
      <div
        className={`fixed inset-0 z-60 flex items-end justify-center transition-opacity duration-200 ${
          modalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ zIndex: 60 }}
        onClick={() => setModalOpen(false)}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          className={`relative bg-surface w-full max-w-md rounded-t-2xl px-4 pt-4 pb-8 space-y-4 transition-transform duration-300 ${
            modalOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-on-surface">{t('clutch.addRecord')}</h2>
            <button
              onClick={() => setModalOpen(false)}
              className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label={t('clutch.date')}
              type="date"
              value={form.date}
              onChange={set('date')}
            />

            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label={t('clutch.father')}
                value={form.fatherReptileId}
                onChange={set('fatherReptileId')}
                options={reptileOptions}
              />
              <SelectField
                label={t('clutch.mother')}
                value={form.motherReptileId}
                onChange={set('motherReptileId')}
                options={reptileOptions}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                {t('clutch.eggCount')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  value={form.eggCount}
                  onChange={set('eggCount')}
                  placeholder="0"
                  className="flex-1 border border-outline-variant rounded-xl px-3 py-2.5 bg-surface-container text-on-surface text-sm focus:outline-none focus:border-primary transition-colors"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustEgg(-1)}
                    className="w-9 h-9 border border-outline-variant rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors text-lg font-semibold"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustEgg(1)}
                    className="w-9 h-9 border border-outline-variant rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors text-lg font-semibold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <InputField
              label={t('clutch.fertileCount')}
              type="number"
              min="0"
              value={form.fertileCount}
              onChange={set('fertileCount')}
              placeholder="0"
            />

            <TextareaField
              label={t('common.notes')}
              value={form.notes}
              onChange={set('notes')}
            />

            <button
              type="submit"
              disabled={saving || !form.eggCount}
              className="w-full bg-primary text-on-primary py-3 rounded-xl font-semibold disabled:opacity-60 active:scale-[0.98] transition-transform"
            >
              {saving ? t('common.saving') : t('clutch.saveBtn')}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
