import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { Card } from '../components/Card'
import { InputField } from '../components/FormField'
import { categoryRepo } from '../db/repos'
import type { Category } from '../db/schema'

export function CategoriesPage() {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const rows = await categoryRepo.getAll()
    setCategories(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setError('')
  }

  const mapError = (code: string): string => {
    if (code === 'CATEGORY_NAME_REQUIRED') return t('categories.errors.nameRequired')
    if (code === 'CATEGORY_DUPLICATE') return t('categories.errors.duplicate')
    if (code === 'CATEGORY_IN_USE') return t('categories.errors.inUse')
    return t('categories.errors.unknown')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (editingId) await categoryRepo.update(editingId, name)
      else await categoryRepo.create(name)
      resetForm()
      await load()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'UNKNOWN'
      setError(mapError(message))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (row: Category) => {
    setEditingId(row.id)
    setName(row.name)
    setError('')
  }

  const handleDelete = async (row: Category) => {
    setError('')
    try {
      await categoryRepo.delete(row.id)
      if (editingId === row.id) resetForm()
      await load()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'UNKNOWN'
      setError(mapError(message))
    }
  }

  return (
    <Layout title={t('categories.title')} back>
      <div className="px-4 pt-4 space-y-4 pb-6">
        <form onSubmit={handleSubmit} className="bg-primary-container/20 rounded-xl p-4 border border-primary-container space-y-3">
          <InputField
            label={t('categories.name')}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('categories.namePlaceholder')}
            error={error || undefined}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
            >
              <Plus size={16} />
              {saving
                ? t('common.saving')
                : editingId
                  ? t('categories.saveEdit')
                  : t('categories.add')}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </form>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-on-surface-variant text-sm">{t('common.loading')}</div>
        ) : categories.length === 0 ? (
          <p className="text-center text-on-surface-variant text-sm py-10">{t('categories.noCategories')}</p>
        ) : (
          <Card>
            {categories.map((row) => (
              <div key={row.id} className="flex items-center gap-2 px-4 py-3 border-b border-outline-variant last:border-0">
                <p className="flex-1 text-sm font-medium text-on-surface">{row.name}</p>
                <button
                  type="button"
                  onClick={() => handleEdit(row)}
                  className="p-1.5 text-on-surface-variant hover:text-primary"
                  aria-label={t('common.edit')}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(row)}
                  className="p-1.5 text-on-surface-variant hover:text-error"
                  aria-label={t('common.delete')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </Card>
        )}
      </div>
    </Layout>
  )
}
