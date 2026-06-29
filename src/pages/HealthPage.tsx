import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { Card, Section } from '../components/Card'
import { InputField, SelectField, TextareaField } from '../components/FormField'
import { weightLogRepo, shedLogRepo, visitLogRepo, reptileRepo } from '../db/repos'
import type { WeightLog, ShedLog, VisitLog } from '../db/schema'
import { WeightChart } from '../components/WeightChart'
import { formatDate } from '../lib/todoEngine'

type HealthTab = 'weight' | 'shed' | 'visit'
type HealthPageLocationState = {
  tab?: HealthTab
}

export function HealthPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const [reptileName, setReptileName] = useState('')
  const [tab, setTab] = useState<HealthTab>(() => {
    const candidate = (location.state as HealthPageLocationState | null)?.tab
    if (candidate === 'weight' || candidate === 'shed' || candidate === 'visit') return candidate
    return 'weight'
  })
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [shedLogs, setShedLogs] = useState<ShedLog[]>([])
  const [visitLogs, setVisitLogs] = useState<VisitLog[]>([])

  const [weightForm, setWeightForm] = useState({ date: new Date().toISOString().slice(0, 10), weight: '', notes: '' })
  const [shedForm, setShedForm] = useState({ date: new Date().toISOString().slice(0, 10), status: 'complete', notes: '' })
  const [visitForm, setVisitForm] = useState({ date: new Date().toISOString().slice(0, 10), summary: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const SHED_STATUS_OPTIONS = [
    { value: 'complete', label: t('health.shed.complete') },
    { value: 'partial', label: t('health.shed.partial') },
    { value: 'stuck', label: t('health.shed.stuck') },
  ]

  const SHED_COLORS: Record<string, string> = {
    complete: 'bg-green-100 text-green-700',
    partial: 'bg-amber-100 text-amber-700',
    stuck: 'bg-red-100 text-red-700',
  }

  const shedShortLabel = (status: string) => {
    if (status === 'complete') return t('health.shed.completeShort')
    if (status === 'partial') return t('health.shed.partialShort')
    return t('health.shed.stuckShort')
  }

  const load = useCallback(async () => {
    if (!id) return
    const [r, w, s, v] = await Promise.all([
      reptileRepo.getById(id),
      weightLogRepo.getByReptile(id),
      shedLogRepo.getByReptile(id),
      visitLogRepo.getByReptile(id),
    ])
    if (!r) { navigate('/reptiles'); return }
    setReptileName(r.name)
    setWeightLogs(w)
    setShedLogs(s)
    setVisitLogs(v)
  }, [id, navigate])

  useEffect(() => { void load() }, [load])

  const setWF = (k: keyof typeof weightForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setWeightForm((f) => ({ ...f, [k]: e.target.value }))
  const setShF = (k: keyof typeof shedForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setShedForm((f) => ({ ...f, [k]: e.target.value }))
  const setVF = (k: keyof typeof visitForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setVisitForm((f) => ({ ...f, [k]: e.target.value }))

  const saveWeight = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !weightForm.weight) return
    setSaving(true)
    await weightLogRepo.create({ reptileId: id, date: weightForm.date, weight: Number(weightForm.weight), notes: weightForm.notes.trim() || undefined })
    setWeightForm({ date: new Date().toISOString().slice(0, 10), weight: '', notes: '' })
    await load()
    setSaving(false)
    setTimeout(() => {
      navigate('/reptiles', {
        state: {
          restoreReptileId: id,
        },
      })
    }, 1000)
  }

  const saveShed = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    await shedLogRepo.create({ reptileId: id, date: shedForm.date, status: shedForm.status as ShedLog['status'], notes: shedForm.notes.trim() || undefined })
    setShedForm({ date: new Date().toISOString().slice(0, 10), status: 'complete', notes: '' })
    await load()
    setSaving(false)
    setTimeout(() => {
      navigate('/reptiles', {
        state: {
          restoreReptileId: id,
        },
      })
    }, 1000)
  }

  const saveVisit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !visitForm.summary.trim()) return
    setSaving(true)
    await visitLogRepo.create({ reptileId: id, date: visitForm.date, summary: visitForm.summary.trim(), notes: visitForm.notes.trim() || undefined })
    setVisitForm({ date: new Date().toISOString().slice(0, 10), summary: '', notes: '' })
    await load()
    setSaving(false)
    setTimeout(() => {
      navigate('/reptiles', {
        state: {
          restoreReptileId: id,
        },
      })
    }, 1000)
  }

  const TABS: { key: HealthTab; label: string }[] = [
    { key: 'weight', label: t('health.tabs.weight') },
    { key: 'shed', label: t('health.tabs.shed') },
    { key: 'visit', label: t('health.tabs.visit') },
  ]

  return (
    <Layout title={`${reptileName} · ${t('health.title')}`} back={`/reptile/${id}`}>
      <div className="bg-white border-b border-gray-200 flex">
        {TABS.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === tb.key ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500'
            }`}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'weight' && (
        <div>
          <form onSubmit={saveWeight} className="px-4 pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <InputField label={t('common.date')} type="date" required value={weightForm.date} onChange={setWF('date')} />
              <InputField label={t('health.weight')} type="number" step="0.1" required value={weightForm.weight} onChange={setWF('weight')} placeholder={t('health.weightPlaceholder')} />
            </div>
            <TextareaField label={t('common.notes')} value={weightForm.notes} onChange={setWF('notes')} />
            <button type="submit" disabled={saving} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-60">
              {saving ? t('common.saving') : t('health.addRecord')}
            </button>
          </form>
          <Section title={t('health.weightChart')}>
            <div className="mx-4"><WeightChart logs={weightLogs} /></div>
          </Section>
          <Section title={t('health.weightSection')}>
            {weightLogs.length === 0 ? <p className="text-center text-gray-400 text-sm py-4">{t('common.noRecords')}</p> : (
              <Card className="mx-4">
                {[...weightLogs].reverse().slice(0, 20).map((l) => (
                  <div key={l.id} className="px-4 py-3 border-b border-gray-100 last:border-0 flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{l.weight} g</p>
                      <p className="text-xs text-gray-400">{formatDate(l.date)}</p>
                      {l.notes && <p className="text-xs text-gray-400">{l.notes}</p>}
                    </div>
                    <button onClick={() => weightLogRepo.delete(l.id).then(load)} className="p-1.5 text-gray-300 hover:text-red-400">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </Card>
            )}
          </Section>
        </div>
      )}

      {tab === 'shed' && (
        <div>
          <form onSubmit={saveShed} className="px-4 pt-4 space-y-3">
            <InputField label={t('common.date')} type="date" required value={shedForm.date} onChange={setShF('date')} />
            <SelectField label={t('health.shedStatus')} value={shedForm.status} onChange={setShF('status')} options={SHED_STATUS_OPTIONS} />
            <TextareaField label={t('common.notes')} value={shedForm.notes} onChange={setShF('notes')} />
            <button type="submit" disabled={saving} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-60">
              {saving ? t('common.saving') : t('health.addRecord')}
            </button>
          </form>
          <Section title={t('health.shedSection')}>
            {shedLogs.length === 0 ? <p className="text-center text-gray-400 text-sm py-4">{t('common.noRecords')}</p> : (
              <Card className="mx-4">
                {shedLogs.map((l) => (
                  <div key={l.id} className="px-4 py-3 border-b border-gray-100 last:border-0 flex items-center gap-2">
                    <div className="flex-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${SHED_COLORS[l.status] ?? ''}`}>
                        {shedShortLabel(l.status)}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(l.date)}</p>
                      {l.notes && <p className="text-xs text-gray-400">{l.notes}</p>}
                    </div>
                    <button onClick={() => shedLogRepo.delete(l.id).then(load)} className="p-1.5 text-gray-300 hover:text-red-400">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </Card>
            )}
          </Section>
        </div>
      )}

      {tab === 'visit' && (
        <div>
          <form onSubmit={saveVisit} className="px-4 pt-4 space-y-3">
            <InputField label={t('common.date')} type="date" required value={visitForm.date} onChange={setVF('date')} />
            <InputField label={t('health.visitSummary')} required value={visitForm.summary} onChange={setVF('summary')} placeholder={t('health.visitPlaceholder')} />
            <TextareaField label={t('common.notes')} value={visitForm.notes} onChange={setVF('notes')} />
            <button type="submit" disabled={saving} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-60">
              {saving ? t('common.saving') : t('health.addRecord')}
            </button>
          </form>
          <Section title={t('health.visitSection')}>
            {visitLogs.length === 0 ? <p className="text-center text-gray-400 text-sm py-4">{t('common.noRecords')}</p> : (
              <Card className="mx-4">
                {visitLogs.map((l) => (
                  <div key={l.id} className="px-4 py-3 border-b border-gray-100 last:border-0 flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{l.summary}</p>
                      <p className="text-xs text-gray-400">{formatDate(l.date)}</p>
                      {l.notes && <p className="text-xs text-gray-400 mt-0.5">{l.notes}</p>}
                    </div>
                    <button onClick={() => visitLogRepo.delete(l.id).then(load)} className="p-1.5 text-gray-300 hover:text-red-400">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </Card>
            )}
          </Section>
        </div>
      )}
    </Layout>
  )
}
