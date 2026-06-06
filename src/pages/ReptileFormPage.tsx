import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { InputField, SelectField, TextareaField } from '../components/FormField'
import { reptileRepo } from '../db/repos'
import type { Reptile } from '../db/schema'

function buildQrUrl(id: string): string {
  return `${window.location.origin}${window.location.pathname}#/reptile/${id}`
}

export function ReptileFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const isEdit = !!id && id !== 'new'

  const SEX_OPTIONS = [
    { value: '', label: t('common.sex.unset') },
    { value: 'male', label: t('common.sex.male') },
    { value: 'female', label: t('common.sex.female') },
    { value: 'unknown', label: t('common.sex.unknown') },
  ]

  const [form, setForm] = useState({
    name: '',
    species: '',
    breed: '',
    sex: '' as '' | 'male' | 'female' | 'unknown',
    birthDate: '',
    enclosureName: '',
    photoUrl: '',
    notes: '',
    allergyInfo: '',
    chronicInfo: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    reptileRepo.getById(id!).then((r) => {
      if (!r) { navigate('/reptiles'); return }
      setForm({
        name: r.name,
        species: r.species,
        breed: r.breed,
        sex: r.sex ?? '',
        birthDate: r.birthDate ?? '',
        enclosureName: r.enclosureName ?? '',
        photoUrl: r.photoUrl ?? '',
        notes: r.notes ?? '',
        allergyInfo: r.allergyInfo ?? '',
        chronicInfo: r.chronicInfo ?? '',
      })
      setLoading(false)
    })
  }, [id, isEdit, navigate])

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }))
      setErrors((e2) => ({ ...e2, [key]: '' }))
    }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = t('reptile.form.nameRequired')
    if (!form.species.trim()) e.species = t('reptile.form.speciesRequired')
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)

    const data: Omit<Reptile, 'id' | 'createdAt' | 'updatedAt'> = {
      name: form.name.trim(),
      species: form.species.trim(),
      breed: form.breed.trim(),
      sex: (form.sex || undefined) as Reptile['sex'],
      birthDate: form.birthDate || undefined,
      enclosureName: form.enclosureName.trim() || undefined,
      photoUrl: form.photoUrl.trim() || undefined,
      notes: form.notes.trim() || undefined,
      allergyInfo: form.allergyInfo.trim() || undefined,
      chronicInfo: form.chronicInfo.trim() || undefined,
      qrTargetUrl: '',
    }

    if (isEdit) {
      await reptileRepo.update(id!, data)
      navigate(`/reptile/${id}`)
    } else {
      const created = await reptileRepo.create(data)
      await reptileRepo.update(created.id, { qrTargetUrl: buildQrUrl(created.id) })
      navigate(`/reptile/${created.id}`)
    }
  }

  const handleDelete = async () => {
    await reptileRepo.delete(id!)
    navigate('/reptiles')
  }

  if (loading) {
    return (
      <Layout title={isEdit ? t('reptile.edit') : t('reptile.new')} back>
        <div className="flex items-center justify-center py-20 text-gray-400">{t('common.loading')}</div>
      </Layout>
    )
  }

  return (
    <Layout
      title={isEdit ? t('reptile.edit') : t('reptile.new')}
      back
      action={
        isEdit ? (
          <button onClick={() => setShowDelete(true)} className="p-1.5 text-red-300 hover:text-red-100 transition-colors">
            <Trash2 size={18} />
          </button>
        ) : undefined
      }
    >
      <form onSubmit={handleSubmit} className="px-4 pt-4 pb-8 space-y-4">
        <InputField label={t('common.name')} required value={form.name} onChange={set('name')} error={errors.name} placeholder={t('reptile.form.namePlaceholder')} />
        <InputField label={t('common.species')} required value={form.species} onChange={set('species')} error={errors.species} placeholder={t('reptile.form.speciesPlaceholder')} />
        <InputField label={t('common.breed')} value={form.breed} onChange={set('breed')} placeholder={t('reptile.form.breedPlaceholder')} />
        <SelectField label={t('common.sex.label')} value={form.sex} onChange={set('sex')} options={SEX_OPTIONS} />
        <InputField label={t('reptile.form.birthDate')} type="date" value={form.birthDate} onChange={set('birthDate')} />
        <InputField label={t('reptile.form.enclosure')} value={form.enclosureName} onChange={set('enclosureName')} placeholder={t('reptile.form.enclosurePlaceholder')} />
        <InputField label={t('reptile.form.photoUrl')} type="url" value={form.photoUrl} onChange={set('photoUrl')} placeholder={t('reptile.form.photoUrlPlaceholder')} />
        <TextareaField label={t('reptile.form.allergyInfo')} value={form.allergyInfo} onChange={set('allergyInfo')} />
        <TextareaField label={t('reptile.form.chronicInfo')} value={form.chronicInfo} onChange={set('chronicInfo')} />
        <TextareaField label={t('common.notes')} value={form.notes} onChange={set('notes')} />

        <button type="submit" disabled={saving}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-60">
          {saving ? t('common.saving') : isEdit ? t('reptile.form.saveChanges') : t('reptile.new')}
        </button>
      </form>

      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowDelete(false)}>
          <div className="bg-white w-full rounded-t-2xl p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-800">{t('reptile.form.deleteTitle')}</h3>
            <p className="text-sm text-gray-500">{t('reptile.form.deleteWarning')}</p>
            <button onClick={handleDelete} className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold">
              {t('reptile.form.confirmDelete')}
            </button>
            <button onClick={() => setShowDelete(false)} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}
