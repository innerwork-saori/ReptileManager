import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { InputField, SelectField, TextareaField } from '../components/FormField'
import { reptileRepo, clutchLogRepo } from '../db/repos'
import type { Reptile } from '../db/schema'

const SEX_LABEL: Record<string, string> = { male: '公', female: '母', unknown: '未知' }

export function ClutchFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [allReptiles, setAllReptiles] = useState<Reptile[]>([])
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    fatherReptileId: '',
    motherReptileId: '',
    eggCount: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    reptileRepo.getAll().then((all) => {
      setAllReptiles(all)
      const current = all.find((r) => r.id === id)
      if (!current) return
      if (current.sex === 'male') setForm((f) => ({ ...f, fatherReptileId: current.id }))
      else if (current.sex === 'female') setForm((f) => ({ ...f, motherReptileId: current.id }))
    })
  }, [id])

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }))
      setErrors((er) => ({ ...er, [key]: '' }))
    }

  const reptileOptions = [
    { value: '', label: t('clutch.unset') },
    ...allReptiles.map((r) => ({
      value: r.id,
      label: `${r.name}${r.sex ? ` (${SEX_LABEL[r.sex] ?? r.sex})` : ''}`,
    })),
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.eggCount || Number(form.eggCount) < 0) errs.eggCount = t('clutch.eggCount')
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)
    await clutchLogRepo.create({
      date: form.date,
      fatherReptileId: form.fatherReptileId || undefined,
      motherReptileId: form.motherReptileId || undefined,
      eggCount: Number(form.eggCount),
      notes: form.notes.trim() || undefined,
    })
    setSaving(false)
    setTimeout(() => {
      navigate('/reptiles')
    }, 1000)
  }

  return (
    <Layout title={t('clutch.title')} back={`/reptile/${id}`}>
      <form onSubmit={handleSubmit} className="px-4 pt-4 pb-8 space-y-4">
        <InputField
          label={t('clutch.date')}
          type="date"
          value={form.date}
          onChange={set('date')}
        />
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
        <InputField
          label={t('clutch.eggCount')}
          type="number"
          min="0"
          value={form.eggCount}
          onChange={set('eggCount')}
          error={errors.eggCount}
          placeholder="0"
        />
        <TextareaField
          label={t('common.notes')}
          value={form.notes}
          onChange={set('notes')}
        />
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-60"
        >
          {saving ? t('common.saving') : t('clutch.saveBtn')}
        </button>
      </form>
    </Layout>
  )
}
