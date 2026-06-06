import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { Card } from '../components/Card'
import { reptileRepo } from '../db/repos'
import type { Reptile } from '../db/schema'
import { calcAge } from '../lib/todoEngine'

export function ReptilesPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [reptiles, setReptiles] = useState<Reptile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    reptileRepo.getAll().then((r) => { setReptiles(r); setLoading(false) })
  }, [])

  const sexLabel = (sex: Reptile['sex']) => {
    if (sex === 'male') return t('common.sex.male')
    if (sex === 'female') return t('common.sex.female')
    return t('common.sex.unknown')
  }

  return (
    <Layout
      title={t('reptile.list')}
      action={
        <button
          onClick={() => navigate('/reptile/new')}
          className="p-1.5 rounded-full bg-green-600 hover:bg-green-500 transition-colors"
        >
          <Plus size={18} />
        </button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">{t('common.loading')}</div>
      ) : reptiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400 px-6">
          <p className="text-center text-sm">{t('reptile.noReptiles')}</p>
          <button
            onClick={() => navigate('/reptile/new')}
            className="bg-green-600 text-white px-6 py-2 rounded-full text-sm font-medium"
          >
            {t('reptile.addFirst')}
          </button>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-3">
          {reptiles.map((r) => (
            <Card key={r.id} onClick={() => navigate(`/reptile/${r.id}`)}>
              <div className="flex items-center gap-3 p-3">
                <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                  {r.photoUrl ? (
                    <img src={r.photoUrl} alt={r.name} className="w-full h-full object-cover" />
                  ) : (
                    '🦎'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{r.name}</p>
                  <p className="text-xs text-gray-500">
                    {r.species} · {r.breed || t('reptile.unknownBreed')}
                  </p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {r.sex && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {sexLabel(r.sex)}
                      </span>
                    )}
                    {r.birthDate && (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                        {calcAge(r.birthDate)}
                      </span>
                    )}
                    {r.enclosureName && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {r.enclosureName}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400 shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  )
}
