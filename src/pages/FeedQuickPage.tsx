import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { InputField, TextareaField } from '../components/FormField'
import { feedLogRepo, reptileRepo } from '../db/repos'
import type { Reptile } from '../db/schema'

export function FeedQuickPage() {
  const { t } = useTranslation()
  const [reptiles, setReptiles] = useState<Reptile[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [form, setForm] = useState({
    fedAt: new Date().toISOString().slice(0, 10),
    foodType: '',
    amount: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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

  useEffect(() => {
    reptileRepo.getAll().then((list) => {
      setReptiles(list)
      if (list.length === 1) setSelectedId(list[0].id)
    })
  }, [])

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.foodType.trim() || !selectedId) return
    setSaving(true)
    await feedLogRepo.create({
      reptileId: selectedId,
      fedAt: new Date(`${form.fedAt}T00:00:00`).toISOString(),
      foodType: form.foodType.trim(),
      amount: form.amount.trim(),
      notes: form.notes.trim() || undefined,
    })
    setForm({ fedAt: new Date().toISOString().slice(0, 10), foodType: '', amount: '', notes: '' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Layout title={t('feed.title')}>
      <form onSubmit={handleSubmit} className="px-4 pt-4 space-y-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            {t('common.name')} <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">{t('reptile.list')}…</option>
            {reptiles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <InputField label={t('common.time')} type="date" value={form.fedAt} onChange={set('fedAt')} required />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            {t('feed.foodType')} <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {FOOD_TYPES.map((foodLabel) => (
              <button
                key={foodLabel}
                type="button"
                onClick={() => setForm((f) => ({ ...f, foodType: foodLabel }))}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  form.foodType === foodLabel
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
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

        <InputField
          label={t('feed.amount')}
          value={form.amount}
          onChange={set('amount')}
          placeholder={t('feed.amountPlaceholder')}
        />
        <TextareaField label={t('common.notes')} value={form.notes} onChange={set('notes')} />

        <button
          type="submit"
          disabled={saving || !form.foodType.trim() || !selectedId}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-60 transition-colors"
        >
          {saved ? `✓ ${t('feed.addBtn')}` : saving ? t('common.saving') : t('feed.addBtn')}
        </button>
      </form>
    </Layout>
  )
}
