import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { InputField, SelectField, TextareaField } from '../components/FormField'
import { usePhotoSrc } from '../components/ReptilePhoto'
import { categoryRepo, photoRepo, reptileRepo } from '../db/repos'
import type { Reptile } from '../db/schema'
import { buildReptileQrPayload } from '../lib/qrPayload'
import { compressImage, type CompressedImage } from '../lib/imageCompress'
import { ReptilePlaceholder } from '../components/ReptilePlaceholder'

const SEX_LABEL: Record<string, string> = { male: '公', female: '母', unknown: '未知' }

function buildQrPayload(id: string): string {
  return buildReptileQrPayload(id)
}

function focusFieldById(fieldId: string) {
  const el = document.getElementById(fieldId) as (HTMLInputElement | HTMLSelectElement | null)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.focus()
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
    category: '',
    sex: '' as '' | 'male' | 'female' | 'unknown',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    enclosureName: '',
    photoUrl: '',
    notes: '',
    chronicInfo: '',
    fatherId: '',
    motherId: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [allReptiles, setAllReptiles] = useState<Reptile[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [photoMode, setPhotoMode] = useState<'upload' | 'url'>('upload')
  const [existingPhotoId, setExistingPhotoId] = useState<string>()
  const [newPhoto, setNewPhoto] = useState<CompressedImage | null>(null)
  const [newPhotoPreview, setNewPhotoPreview] = useState<string>()
  const [photoProcessing, setPhotoProcessing] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const { src: existingPhotoSrc } = usePhotoSrc(existingPhotoId ? { photoId: existingPhotoId } : undefined)
  const uploadPreview = newPhotoPreview ?? existingPhotoSrc

  useEffect(() => {
    if (!newPhotoPreview) return
    return () => URL.revokeObjectURL(newPhotoPreview)
  }, [newPhotoPreview])

  useEffect(() => {
    reptileRepo.getAll().then(setAllReptiles)
    categoryRepo.getAll().then((rows) => setCategories(rows.map((row) => row.name)))
  }, [])

  useEffect(() => {
    if (!isEdit) return
    reptileRepo.getById(id!).then((r) => {
      if (!r) { navigate('/reptiles'); return }
      const bdParts = (r.birthDate ?? '').split('-')
      setForm({
        name: r.name,
        species: r.species,
        breed: r.breed,
        category: r.category ?? '',
        sex: r.sex ?? '',
        birthYear: bdParts[0] ?? '',
        birthMonth: bdParts[1] ?? '',
        birthDay: bdParts[2] ?? '',
        enclosureName: r.enclosureName ?? '',
        photoUrl: r.photoUrl ?? '',
        notes: r.notes ?? '',
        chronicInfo: r.chronicInfo ?? '',
        fatherId: r.fatherId ?? '',
        motherId: r.motherId ?? '',
      })
      setExistingPhotoId(r.photoId)
      setPhotoMode(r.photoUrl && !r.photoId ? 'url' : 'upload')
      setLoading(false)
    })
  }, [id, isEdit, navigate])

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }))
      setErrors((e2) => ({ ...e2, [key]: '' }))
    }

  const setCategory = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCategory = e.target.value
    setForm((f) => ({
      ...f,
      category: nextCategory,
      species: f.species.trim() ? f.species : nextCategory,
    }))
    setErrors((e2) => ({ ...e2, category: '' }))
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoError('')
    setPhotoProcessing(true)
    try {
      const compressed = await compressImage(file)
      setNewPhoto(compressed)
      setNewPhotoPreview(URL.createObjectURL(compressed.blob))
    } catch (err) {
      const code = err instanceof Error ? err.message : ''
      setPhotoError(
        code === 'not_image' ? t('reptile.form.photoErrorNotImage')
          : code === 'too_large' ? t('reptile.form.photoErrorTooLarge')
            : t('reptile.form.photoErrorDecode'),
      )
    } finally {
      setPhotoProcessing(false)
    }
  }

  const handlePhotoRemove = () => {
    setNewPhoto(null)
    setNewPhotoPreview(undefined)
    setExistingPhotoId(undefined)
    setPhotoError('')
  }

  const categoryOptions = useMemo(() => {
    const options = new Map<string, string>()
    for (const name of categories) {
      const key = name.trim().toLowerCase()
      if (!key) continue
      if (!options.has(key)) options.set(key, name)
    }
    if (form.category) {
      const key = form.category.trim().toLowerCase()
      if (key && !options.has(key)) options.set(key, form.category)
    }
    return [
      { value: '', label: t('common.select') },
      ...[...options.values()].map((name) => ({ value: name, label: name })),
    ]
  }, [categories, form.category, t])

  const buildBirthDate = (): string | undefined => {
    if (!form.birthYear) return undefined
    const parts = [form.birthYear.padStart(4, '0')]
    if (form.birthMonth) {
      parts.push(form.birthMonth.padStart(2, '0'))
      if (form.birthDay) parts.push(form.birthDay.padStart(2, '0'))
    }
    return parts.join('-')
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = t('reptile.form.nameRequired')
    if (!form.category.trim()) e.category = t('reptile.form.categoryRequired')
    if (!form.species.trim()) e.species = t('reptile.form.speciesRequired')
    if ((form.birthMonth || form.birthDay) && !form.birthYear) e.birthYear = t('reptile.form.birthYearRequired')
    return e
  }

  const focusFirstInvalidField = (errs: Record<string, string>) => {
    if (errs.name) {
      focusFieldById('reptile-form-name')
      return
    }
    if (errs.category) {
      focusFieldById('reptile-form-category')
      return
    }
    if (errs.species) {
      focusFieldById('reptile-form-species')
      return
    }
    if (errs.birthYear) {
      focusFieldById('reptile-form-birth-year')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      requestAnimationFrame(() => focusFirstInvalidField(errs))
      return
    }
    setSaving(true)

    const data: Omit<Reptile, 'id' | 'createdAt' | 'updatedAt'> = {
      name: form.name.trim(),
      species: form.species.trim(),
      breed: form.breed.trim(),
      category: form.category.trim(),
      sex: (form.sex || undefined) as Reptile['sex'],
      birthDate: buildBirthDate(),
      enclosureName: form.enclosureName.trim() || undefined,
      photoUrl: photoMode === 'url' ? form.photoUrl.trim() || undefined : undefined,
      photoId: photoMode === 'upload' && !newPhoto ? existingPhotoId : undefined,
      notes: form.notes.trim() || undefined,
      chronicInfo: form.chronicInfo.trim() || undefined,
      fatherId: form.fatherId || undefined,
      motherId: form.motherId || undefined,
      qrTargetUrl: '',
    }

    const reptileId = isEdit ? id! : (await reptileRepo.create(data)).id
    const patch: Partial<Reptile> = isEdit ? data : { qrTargetUrl: buildQrPayload(reptileId) }
    if (photoMode === 'upload' && newPhoto) {
      patch.photoId = (await photoRepo.saveForReptile(reptileId, newPhoto)).id
    } else if (!data.photoId) {
      await photoRepo.deleteByReptile(reptileId)
    }
    await reptileRepo.update(reptileId, patch)
    navigate(`/reptile/${reptileId}`)
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
        <InputField id="reptile-form-name" label={t('common.name')} required value={form.name} onChange={set('name')} error={errors.name} placeholder={t('reptile.form.namePlaceholder')} />
        <SelectField id="reptile-form-category" label={t('reptile.form.category')} required value={form.category} onChange={setCategory} options={categoryOptions} error={errors.category} />
        <InputField id="reptile-form-species" label={t('common.species')} required value={form.species} onChange={set('species')} error={errors.species} placeholder={t('reptile.form.speciesPlaceholder')} />
        <InputField label={t('common.breed')} value={form.breed} onChange={set('breed')} placeholder={t('reptile.form.breedPlaceholder')} />
        <SelectField label={t('common.sex.label')} value={form.sex} onChange={set('sex')} options={SEX_OPTIONS} />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">{t('reptile.form.birthDate')}</label>
          <div className="flex gap-2 items-center">
            <input
              id="reptile-form-birth-year"
              type="number" placeholder={t('reptile.form.birthYearPlaceholder')} min="1900" max={new Date().getFullYear()}
              value={form.birthYear}
              onChange={(e) => { setForm((f) => ({ ...f, birthYear: e.target.value })); setErrors((er) => ({ ...er, birthYear: '' })) }}
              className={`w-24 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.birthYear ? 'border-red-400' : 'border-gray-300'}`}
            />
            <span className="text-gray-400 text-sm">/</span>
            <input
              type="number" placeholder={t('reptile.form.birthMonthPlaceholder')} min="1" max="12"
              value={form.birthMonth}
              onChange={(e) => setForm((f) => ({ ...f, birthMonth: e.target.value }))}
              className="w-16 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <span className="text-gray-400 text-sm">/</span>
            <input
              type="number" placeholder={t('reptile.form.birthDayPlaceholder')} min="1" max="31"
              value={form.birthDay}
              onChange={(e) => setForm((f) => ({ ...f, birthDay: e.target.value }))}
              className="w-16 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          {errors.birthYear && <p className="text-xs text-red-500 mt-0.5">{errors.birthYear}</p>}
        </div>
        <section className="space-y-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <h2 className="text-sm font-semibold text-primary">{t('reptile.form.pairing')}</h2>
          <SelectField
            label={t('reptile.form.father')}
            value={form.fatherId}
            onChange={set('fatherId')}
            options={[
              { value: '', label: t('reptile.form.parentUnset') },
              ...allReptiles
                .filter((r) => r.id !== id)
                .map((r) => ({ value: r.id, label: `${r.name}${r.sex ? ` (${SEX_LABEL[r.sex] ?? r.sex})` : ''}` })),
            ]}
          />
          <SelectField
            label={t('reptile.form.mother')}
            value={form.motherId}
            onChange={set('motherId')}
            options={[
              { value: '', label: t('reptile.form.parentUnset') },
              ...allReptiles
                .filter((r) => r.id !== id)
                .map((r) => ({ value: r.id, label: `${r.name}${r.sex ? ` (${SEX_LABEL[r.sex] ?? r.sex})` : ''}` })),
            ]}
          />
        </section>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">{t('reptile.form.photo')}</label>
            <div className="flex rounded-lg border border-gray-300 p-0.5 text-xs">
              {(['upload', 'url'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPhotoMode(mode)}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${photoMode === mode ? 'bg-green-600 text-white' : 'text-gray-600'}`}
                >
                  {mode === 'upload' ? t('reptile.form.photoModeUpload') : t('reptile.form.photoModeUrl')}
                </button>
              ))}
            </div>
          </div>
          {photoMode === 'upload' ? (
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-gray-300 bg-surface-container flex items-center justify-center">
                  {uploadPreview
                    ? <img src={uploadPreview} alt={form.name} className="w-full h-full object-cover" />
                    : <ReptilePlaceholder />}
                </div>
                <div className="flex flex-col gap-2">
                  <label className={`inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white ${photoProcessing ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}>
                    <ImagePlus size={16} />
                    {photoProcessing
                      ? t('reptile.form.photoProcessing')
                      : uploadPreview ? t('reptile.form.photoChange') : t('reptile.form.photoChoose')}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} disabled={photoProcessing} />
                  </label>
                  {uploadPreview && (
                    <button type="button" onClick={handlePhotoRemove} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600">
                      {t('reptile.form.photoRemove')}
                    </button>
                  )}
                </div>
              </div>
              {photoError && <p className="text-xs text-red-500">{photoError}</p>}
              <p className="text-xs text-gray-500">{t('reptile.form.photoLocalHint')}</p>
            </div>
          ) : (
            <input
              type="url"
              value={form.photoUrl}
              onChange={set('photoUrl')}
              placeholder={t('reptile.form.photoUrlPlaceholder')}
              aria-label={t('reptile.form.photoUrl')}
              className="w-full h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          )}
        </div>
        <TextareaField label={t('reptile.form.chronicInfo')} value={form.chronicInfo} onChange={set('chronicInfo')} />
        <TextareaField label={t('common.notes')} value={form.notes} onChange={set('notes')} />
        <InputField label={t('reptile.form.enclosure')} value={form.enclosureName} onChange={set('enclosureName')} placeholder={t('reptile.form.enclosurePlaceholder')} />

        <button type="submit" disabled={saving || photoProcessing}
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
