import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Edit, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { Card, Section } from '../components/Card'
import { InputField, SelectField, TextareaField } from '../components/FormField'
import { feedLogRepo, reptileRepo } from '../db/repos'
import type { FeedLog, Reptile } from '../db/schema'
import { formatDate } from '../lib/todoEngine'

const INITIAL_FORM = {
  fedAt: new Date().toISOString().slice(0, 10),
  foodType: '',
  amountOption: '',
  customAmount: '',
  notes: '',
}

export function FeedPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const isQuickMode = !id
  const [reptiles, setReptiles] = useState<Reptile[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [reptileName, setReptileName] = useState('')
  const [logs, setLogs] = useState<FeedLog[]>([])
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [editingAmount, setEditingAmount] = useState('')
  const [updatingAmount, setUpdatingAmount] = useState(false)

  const foodTypes = [
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

  const amountOptions = [
    { value: '', label: t('feed.amountSelectPlaceholder') },
    ...['1', '2', '3', '4', '5'].map((value) => ({ value, label: value })),
    { value: 'more', label: t('feed.amountMore') },
  ]

  const load = useCallback(async () => {
    if (!id) return
    const [reptile, feedLogs] = await Promise.all([
      reptileRepo.getById(id),
      feedLogRepo.getByReptile(id),
    ])
    if (!reptile) {
      navigate('/reptiles')
      return
    }
    setReptileName(reptile.name)
    setLogs(feedLogs)
  }, [id, navigate])

  useEffect(() => {
    if (isQuickMode) {
      reptileRepo.getAll().then((list) => {
        setReptiles(list)
        if (list.length === 1) setSelectedId(list[0].id)
      })
      return
    }
    void load()
  }, [isQuickMode, load])

  const set = (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }))

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const reptileId = id ?? selectedId
    if (!form.foodType.trim() || !reptileId || (form.amountOption === 'more' && !form.customAmount)) return

    setSaving(true)
    await feedLogRepo.create({
      reptileId,
      fedAt: new Date(`${form.fedAt}T00:00:00`).toISOString(),
      foodType: form.foodType.trim(),
      amount: (form.amountOption === 'more' ? form.customAmount : form.amountOption).trim(),
      notes: form.notes.trim() || undefined,
    })
    setForm({ ...INITIAL_FORM, fedAt: new Date().toISOString().slice(0, 10) })

    if (isQuickMode) {
      setSaving(false)
      setSaved(true)
      setTimeout(() => {
        setSelectedId('')
        setSaved(false)
      }, 1000)
      return
    }

    await load()
    setSaving(false)
    setTimeout(() => {
      navigate('/reptiles', { state: { restoreReptileId: id } })
    }, 1000)
  }

  const startEditingAmount = (log: FeedLog) => {
    setEditingLogId(log.id)
    setEditingAmount(log.amount)
  }

  const cancelEditingAmount = () => {
    setEditingLogId(null)
    setEditingAmount('')
  }

  const handleUpdateAmount = async (event: React.FormEvent) => {
    event.preventDefault()
    const amount = editingAmount.trim()
    if (!editingLogId || !/^[1-9]\d*$/.test(amount)) return

    setUpdatingAmount(true)
    try {
      await feedLogRepo.updateAmount(editingLogId, amount)
      cancelEditingAmount()
      await load()
    } finally {
      setUpdatingAmount(false)
    }
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="px-4 pt-4 space-y-3">
      {isQuickMode && (
        <SelectField
          label={t('common.name')}
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          required
          options={[
            { value: '', label: `${t('reptile.list')}…` },
            ...reptiles.map((reptile) => ({ value: reptile.id, label: reptile.name })),
          ]}
        />
      )}

      <InputField label={t('common.time')} type="date" value={form.fedAt} onChange={set('fedAt')} required />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          {t('feed.foodType')} <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {foodTypes.map((foodLabel) => (
            <button
              key={foodLabel}
              type="button"
              onClick={() => setForm((current) => ({ ...current, foodType: foodLabel }))}
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
          value={foodTypes.includes(form.foodType) ? '' : form.foodType}
          onChange={(event) => setForm((current) => ({ ...current, foodType: event.target.value }))}
        />
      </div>

      <SelectField
        label={t('feed.amount')}
        value={form.amountOption}
        onChange={(event) => setForm((current) => ({
          ...current,
          amountOption: event.target.value,
          customAmount: event.target.value === 'more' ? current.customAmount : '',
        }))}
        options={amountOptions}
      />
      {form.amountOption === 'more' && (
        <InputField
          label={t('feed.customAmount')}
          type="number"
          min="1"
          step="1"
          value={form.customAmount}
          onChange={(event) => setForm((current) => ({ ...current, customAmount: event.target.value }))}
          placeholder={t('feed.customAmountPlaceholder')}
          required
        />
      )}

      <TextareaField label={t('common.notes')} value={form.notes} onChange={set('notes')} />

      <button
        type="submit"
        disabled={saving || !form.foodType.trim() || (!id && !selectedId)}
        className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-60 transition-colors"
      >
        {saved ? `✓ ${t('feed.addBtn')}` : saving ? t('common.saving') : t('feed.addBtn')}
      </button>
    </form>
  )

  return (
    <Layout title={isQuickMode ? t('feed.title') : `${reptileName} · ${t('feed.title')}`} back={id ? `/reptile/${id}` : undefined}>
      {formContent}
      {!isQuickMode && (
        <Section title={t('feed.records')}>
          {logs.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">{t('common.noRecords')}</p>
          ) : (
            <Card className="mx-4">
              {logs.map((log) => (
                <div key={log.id} className="px-4 py-3 border-b border-gray-100 last:border-0 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{log.foodType}</p>
                    {editingLogId === log.id ? (
                      <form onSubmit={handleUpdateAmount} className="mt-1 flex items-center gap-2">
                        <InputField
                          label={t('feed.editAmount')}
                          type="number"
                          min="1"
                          step="1"
                          value={editingAmount}
                          onChange={(event) => setEditingAmount(event.target.value)}
                          aria-label={t('feed.editAmount')}
                          autoFocus
                          required
                        />
                        <button
                          type="submit"
                          disabled={updatingAmount || !/^[1-9]\d*$/.test(editingAmount.trim())}
                          className="shrink-0 p-1.5 text-green-700 disabled:opacity-40"
                          aria-label={t('common.save')}
                          title={t('common.save')}
                        >
                          <Check size={17} />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingAmount}
                          disabled={updatingAmount}
                          className="shrink-0 p-1.5 text-gray-400 disabled:opacity-40"
                          aria-label={t('common.cancel')}
                          title={t('common.cancel')}
                        >
                          <X size={17} />
                        </button>
                      </form>
                    ) : (
                      <p className="text-xs text-gray-500">{log.amount} · {formatDate(log.fedAt)}</p>
                    )}
                    {log.notes && <p className="text-xs text-gray-400 mt-0.5">{log.notes}</p>}
                  </div>
                  {editingLogId !== log.id && (
                    <>
                      <button
                        onClick={() => startEditingAmount(log)}
                        className="shrink-0 p-1.5 text-gray-300 hover:text-gray-600 transition-colors"
                        aria-label={t('feed.editAmount')}
                        title={t('feed.editAmount')}
                      >
                        <Edit size={15} />
                      </button>
                      <button onClick={() => feedLogRepo.delete(log.id).then(load)} className="shrink-0 p-1.5 text-gray-300 hover:text-red-400 transition-colors" aria-label={t('common.delete')} title={t('common.delete')}>
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </Card>
          )}
        </Section>
      )}
    </Layout>
  )
}
