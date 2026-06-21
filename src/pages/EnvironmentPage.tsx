import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { Card, Section } from '../components/Card'
import { InputField, TextareaField } from '../components/FormField'
import { habitatLogRepo, uvbLogRepo, substrateLogRepo, reptileRepo } from '../db/repos'
import type { HabitatLog, UvbLog, SubstrateLog } from '../db/schema'
import { formatDateTime, formatDate } from '../lib/todoEngine'

type EnvTab = 'habitat' | 'uvb' | 'substrate'

export function EnvironmentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [reptileName, setReptileName] = useState('')
  const [tab, setTab] = useState<EnvTab>('habitat')
  const [habitatLogs, setHabitatLogs] = useState<HabitatLog[]>([])
  const [uvbLogs, setUvbLogs] = useState<UvbLog[]>([])
  const [substrateLogs, setSubstrateLogs] = useState<SubstrateLog[]>([])

  const [habitatForm, setHabitatForm] = useState({
    loggedAt: new Date().toISOString().slice(0, 16), temperature: '', humidity: '', notes: '',
  })
  const [uvbForm, setUvbForm] = useState({
    lampName: '', startedAt: new Date().toISOString().slice(0, 10), expectedReplaceAt: '', notes: '',
  })
  const [substrateForm, setSubstrateForm] = useState({
    changedAt: new Date().toISOString().slice(0, 16), substrateType: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const [r, h, u, s] = await Promise.all([
      reptileRepo.getById(id),
      habitatLogRepo.getByReptile(id),
      uvbLogRepo.getByReptile(id),
      substrateLogRepo.getByReptile(id),
    ])
    if (!r) { navigate('/reptiles'); return }
    setReptileName(r.name)
    setHabitatLogs(h)
    setUvbLogs(u)
    setSubstrateLogs(s)
  }, [id, navigate])

  useEffect(() => { void load() }, [load])

  const setHF = (k: keyof typeof habitatForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setHabitatForm((f) => ({ ...f, [k]: e.target.value }))
  const setUF = (k: keyof typeof uvbForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setUvbForm((f) => ({ ...f, [k]: e.target.value }))
  const setSF = (k: keyof typeof substrateForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setSubstrateForm((f) => ({ ...f, [k]: e.target.value }))

  const saveHabitat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || (!habitatForm.temperature && !habitatForm.humidity)) return
    setSaving(true)
    await habitatLogRepo.create({
      reptileId: id,
      loggedAt: new Date(habitatForm.loggedAt).toISOString(),
      temperature: habitatForm.temperature ? Number(habitatForm.temperature) : undefined,
      humidity: habitatForm.humidity ? Number(habitatForm.humidity) : undefined,
      notes: habitatForm.notes.trim() || undefined,
    })
    setHabitatForm({ loggedAt: new Date().toISOString().slice(0, 16), temperature: '', humidity: '', notes: '' })
    await load()
    setSaving(false)
    setTimeout(() => {
      navigate('/reptiles')
    }, 1000)
  }

  const saveUvb = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !uvbForm.lampName.trim()) return
    setSaving(true)
    await uvbLogRepo.create({
      reptileId: id,
      lampName: uvbForm.lampName.trim(),
      startedAt: new Date(uvbForm.startedAt).toISOString(),
      expectedReplaceAt: uvbForm.expectedReplaceAt ? new Date(uvbForm.expectedReplaceAt).toISOString() : undefined,
      notes: uvbForm.notes.trim() || undefined,
    })
    setUvbForm({ lampName: '', startedAt: new Date().toISOString().slice(0, 10), expectedReplaceAt: '', notes: '' })
    await load()
    setSaving(false)
    setTimeout(() => {
      navigate('/reptiles')
    }, 1000)
  }

  const saveSubstrate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !substrateForm.substrateType.trim()) return
    setSaving(true)
    await substrateLogRepo.create({
      reptileId: id,
      changedAt: new Date(substrateForm.changedAt).toISOString(),
      substrateType: substrateForm.substrateType.trim(),
      notes: substrateForm.notes.trim() || undefined,
    })
    setSubstrateForm({ changedAt: new Date().toISOString().slice(0, 16), substrateType: '', notes: '' })
    await load()
    setSaving(false)
    setTimeout(() => {
      navigate('/reptiles')
    }, 1000)
  }

  const TABS: { key: EnvTab; label: string }[] = [
    { key: 'habitat', label: t('environment.tabs.habitat') },
    { key: 'uvb', label: t('environment.tabs.uvb') },
    { key: 'substrate', label: t('environment.tabs.substrate') },
  ]

  return (
    <Layout title={`${reptileName} · ${t('environment.title')}`} back={`/reptile/${id}`}>
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

      {tab === 'habitat' && (
        <div>
          <form onSubmit={saveHabitat} className="px-4 pt-4 space-y-3">
            <InputField label={t('common.time')} type="datetime-local" value={habitatForm.loggedAt} onChange={setHF('loggedAt')} />
            <div className="grid grid-cols-2 gap-3">
              <InputField label={t('environment.temperature')} type="number" step="0.1" value={habitatForm.temperature} onChange={setHF('temperature')} placeholder={t('environment.tempPlaceholder')} />
              <InputField label={t('environment.humidity')} type="number" step="1" value={habitatForm.humidity} onChange={setHF('humidity')} placeholder={t('environment.humidityPlaceholder')} />
            </div>
            <TextareaField label={t('common.notes')} value={habitatForm.notes} onChange={setHF('notes')} />
            <button type="submit" disabled={saving} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-60">
              {t('environment.addRecord')}
            </button>
          </form>
          <Section title={t('environment.habitatSection')}>
            {habitatLogs.length === 0 ? <p className="text-center text-gray-400 text-sm py-6">{t('common.noRecords')}</p> : (
              <Card className="mx-4">
                {habitatLogs.slice(0, 20).map((l) => (
                  <div key={l.id} className="px-4 py-3 border-b border-gray-100 last:border-0 flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex gap-3">
                        {l.temperature != null && <span className="text-sm font-medium text-gray-800">{l.temperature} °C</span>}
                        {l.humidity != null && <span className="text-sm text-gray-500">{l.humidity}%</span>}
                      </div>
                      <p className="text-xs text-gray-400">{formatDateTime(l.loggedAt)}</p>
                    </div>
                    <button onClick={() => habitatLogRepo.delete(l.id).then(load)} className="p-1.5 text-gray-300 hover:text-red-400">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </Card>
            )}
          </Section>
        </div>
      )}

      {tab === 'uvb' && (
        <div>
          <form onSubmit={saveUvb} className="px-4 pt-4 space-y-3">
            <InputField label={t('environment.lampName')} required value={uvbForm.lampName} onChange={setUF('lampName')} placeholder={t('environment.lampPlaceholder')} />
            <InputField label={t('environment.startDate')} type="date" value={uvbForm.startedAt} onChange={setUF('startedAt')} />
            <InputField label={t('environment.expectedReplace')} type="date" value={uvbForm.expectedReplaceAt} onChange={setUF('expectedReplaceAt')} />
            <TextareaField label={t('common.notes')} value={uvbForm.notes} onChange={setUF('notes')} />
            <button type="submit" disabled={saving} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-60">
              {t('environment.addLamp')}
            </button>
          </form>
          <Section title={t('environment.uvbSection')}>
            {uvbLogs.length === 0 ? <p className="text-center text-gray-400 text-sm py-6">{t('environment.noUvb')}</p> : (
              <Card className="mx-4">
                {uvbLogs.map((l) => {
                  const isExpiringSoon = l.expectedReplaceAt && new Date(l.expectedReplaceAt).getTime() - Date.now() < 30 * 24 * 3600 * 1000
                  return (
                    <div key={l.id} className="px-4 py-3 border-b border-gray-100 last:border-0 flex items-start gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{l.lampName}</p>
                        <p className="text-xs text-gray-500">{t('environment.startDate')}：{formatDate(l.startedAt)}</p>
                        {l.expectedReplaceAt && (
                          <p className={`text-xs ${isExpiringSoon ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                            {t('environment.expectedReplaceLabel', { date: formatDate(l.expectedReplaceAt) })}{isExpiringSoon && ' ⚠️'}
                          </p>
                        )}
                      </div>
                      <button onClick={() => uvbLogRepo.delete(l.id).then(load)} className="p-1.5 text-gray-300 hover:text-red-400">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )
                })}
              </Card>
            )}
          </Section>
        </div>
      )}

      {tab === 'substrate' && (
        <div>
          <form onSubmit={saveSubstrate} className="px-4 pt-4 space-y-3">
            <InputField label={t('environment.changeTime')} type="datetime-local" value={substrateForm.changedAt} onChange={setSF('changedAt')} />
            <InputField label={t('environment.substrateType')} required value={substrateForm.substrateType} onChange={setSF('substrateType')} placeholder={t('environment.substratePlaceholder')} />
            <TextareaField label={t('common.notes')} value={substrateForm.notes} onChange={setSF('notes')} />
            <button type="submit" disabled={saving} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-60">
              {t('environment.addRecord')}
            </button>
          </form>
          <Section title={t('environment.substrateSection')}>
            {substrateLogs.length === 0 ? <p className="text-center text-gray-400 text-sm py-6">{t('environment.noSubstrate')}</p> : (
              <Card className="mx-4">
                {substrateLogs.slice(0, 20).map((l) => (
                  <div key={l.id} className="px-4 py-3 border-b border-gray-100 last:border-0 flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{l.substrateType}</p>
                      <p className="text-xs text-gray-400">{formatDateTime(l.changedAt)}</p>
                    </div>
                    <button onClick={() => substrateLogRepo.delete(l.id).then(load)} className="p-1.5 text-gray-300 hover:text-red-400">
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
