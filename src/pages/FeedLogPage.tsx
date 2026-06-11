import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { Card, Section } from '../components/Card'
import { InputField, TextareaField } from '../components/FormField'
import { feedLogRepo, reptileRepo } from '../db/repos'
import type { FeedLog } from '../db/schema'
import { formatDate } from '../lib/todoEngine'

export function FeedLogPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [reptileName, setReptileName] = useState('')
  const [logs, setLogs] = useState<FeedLog[]>([])
  const [form, setForm] = useState({
    fedAt: new Date().toISOString().slice(0, 10),
    foodType: '',
    amount: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const FOOD_TYPES = [
    t('feed.foods.black_cricket'),
    t('feed.foods.white_cricket'),
    t('feed.foods.dubia'),
    t('feed.foods.rat_pinky'),
    t('feed.foods.rat_s'),
    t('feed.foods.rat_m'),
    t('feed.foods.rat_l'),
    t('feed.foods.rat_xl'),
    t('feed.foods.other'),
  ]

  const load = useCallback(async () => {
    if (!id) return
    const [r, l] = await Promise.all([reptileRepo.getById(id), feedLogRepo.getByReptile(id)])
    if (!r) { navigate('/reptiles'); return }
    setReptileName(r.name)
    setLogs(l)
  }, [id, navigate])

  useEffect(() => { void load() }, [load])

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.foodType.trim() || !id) return
    setSaving(true)
    await feedLogRepo.create({
      reptileId: id,
      fedAt: new Date(`${form.fedAt}T00:00:00`).toISOString(),
      foodType: form.foodType.trim(),
      amount: form.amount.trim(),
      notes: form.notes.trim() || undefined,
    })
    setForm({ fedAt: new Date().toISOString().slice(0, 16), foodType: '', amount: '', notes: '' })
    await load()
    setSaving(false)
  }

  return (
    <Layout title={`${reptileName} · ${t('feed.title')}`} back={`/reptile/${id}`}>
      <form onSubmit={handleSubmit} className="px-4 pt-4 space-y-3">
        <InputField label={t('common.time')} type="date" value={form.fedAt} onChange={set('fedAt')} required />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            {t('feed.foodType')} <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {FOOD_TYPES.map((foodLabel) => (
              <button key={foodLabel} type="button"
                onClick={() => setForm((f) => ({ ...f, foodType: foodLabel }))}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  form.foodType === foodLabel
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}>
                {foodLabel}
              </button>
            ))}
          </div>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder={t('feed.customFood')}
            value={FOOD_TYPES.includes(form.foodType) ? '' : form.foodType}
            onChange={(e) => setForm((f) => ({ ...f, foodType: e.target.value }))}
          />
        </div>
        <InputField label={t('feed.amount')} value={form.amount} onChange={set('amount')} placeholder={t('feed.amountPlaceholder')} />
        <TextareaField label={t('common.notes')} value={form.notes} onChange={set('notes')} />
        <button type="submit" disabled={saving || !form.foodType.trim()}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-60">
          {saving ? t('common.saving') : t('feed.addBtn')}
        </button>
      </form>

      <Section title={t('feed.records')}>
        {logs.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">{t('common.noRecords')}</p>
        ) : (
          <Card className="mx-4">
            {logs.map((l) => (
              <div key={l.id} className="px-4 py-3 border-b border-gray-100 last:border-0 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{l.foodType}</p>
                  <p className="text-xs text-gray-500">{l.amount} · {formatDate(l.fedAt)}</p>
                  {l.notes && <p className="text-xs text-gray-400 mt-0.5">{l.notes}</p>}
                </div>
                <button onClick={() => feedLogRepo.delete(l.id).then(load)}
                  className="shrink-0 p-1.5 text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </Card>
        )}
      </Section>
    </Layout>
  )
}
