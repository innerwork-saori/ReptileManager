import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Edit, QrCode, Utensils, Pill, Thermometer, CheckSquare, Scale, Stethoscope } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { Card, Section } from '../components/Card'
import { reptileRepo, feedLogRepo, weightLogRepo, medicationCourseRepo, shedLogRepo, habitatLogRepo, visitLogRepo } from '../db/repos'
import type { Reptile, FeedLog, WeightLog, MedicationCourse, ShedLog, HabitatLog, VisitLog } from '../db/schema'
import { formatRelativeTime, formatDate, formatDateTime, calcAge } from '../lib/todoEngine'

type Tab = 'overview' | 'feed' | 'medication' | 'environment' | 'health'

export function ReptileDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [reptile, setReptile] = useState<Reptile | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [feedLogs, setFeedLogs] = useState<FeedLog[]>([])
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [courses, setCourses] = useState<MedicationCourse[]>([])
  const [shedLogs, setShedLogs] = useState<ShedLog[]>([])
  const [habitatLogs, setHabitatLogs] = useState<HabitatLog[]>([])
  const [visitLogs, setVisitLogs] = useState<VisitLog[]>([])
  const [showQr, setShowQr] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const r = await reptileRepo.getById(id)
    if (!r) { navigate('/reptiles'); return }
    setReptile(r)
    const [feeds, weights, meds, sheds, habitats, visits] = await Promise.all([
      feedLogRepo.getByReptile(id),
      weightLogRepo.getByReptile(id),
      medicationCourseRepo.getByReptile(id),
      shedLogRepo.getByReptile(id),
      habitatLogRepo.getByReptile(id),
      visitLogRepo.getByReptile(id),
    ])
    setFeedLogs(feeds)
    setWeightLogs(weights)
    setCourses(meds)
    setShedLogs(sheds)
    setHabitatLogs(habitats)
    setVisitLogs(visits)
  }, [id, navigate])

  useEffect(() => { void load() }, [load])

  if (!reptile) {
    return (
      <Layout title={t('reptile.detail')} back="/reptiles">
        <div className="flex items-center justify-center py-20 text-gray-400">{t('common.loading')}</div>
      </Layout>
    )
  }

  const sexLabel = (sex: Reptile['sex']) => {
    if (sex === 'male') return t('common.sex.male')
    if (sex === 'female') return t('common.sex.female')
    return t('common.sex.unknown')
  }

  const shedLabel = (status: ShedLog['status']) => {
    if (status === 'complete') return t('reptile.shed.complete')
    if (status === 'partial') return t('reptile.shed.partial')
    return t('reptile.shed.stuck')
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: t('reptile.tabs.overview'), icon: <Scale size={14} /> },
    { key: 'feed', label: t('reptile.tabs.feed'), icon: <Utensils size={14} /> },
    { key: 'medication', label: t('reptile.tabs.medication'), icon: <Pill size={14} /> },
    { key: 'environment', label: t('reptile.tabs.environment'), icon: <Thermometer size={14} /> },
    { key: 'health', label: t('reptile.tabs.health'), icon: <Stethoscope size={14} /> },
  ]

  return (
    <Layout
      title={reptile.name}
      back="/reptiles"
      action={
        <div className="flex gap-2">
          <button onClick={() => setShowQr(true)} className="p-1.5 hover:bg-green-600 rounded-full transition-colors">
            <QrCode size={18} />
          </button>
          <Link to={`/reptile/${id}/edit`} className="p-1.5 hover:bg-green-600 rounded-full transition-colors block">
            <Edit size={18} />
          </Link>
        </div>
      }
    >
      <div className="bg-green-700 text-white px-4 pt-4 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-green-600 flex items-center justify-center text-3xl overflow-hidden">
            {reptile.photoUrl ? <img src={reptile.photoUrl} alt={reptile.name} className="w-full h-full object-cover" /> : '🦎'}
          </div>
          <div>
            <p className="text-sm text-green-200">{reptile.species}{reptile.breed && ` · ${reptile.breed}`}</p>
            <div className="flex gap-2 mt-1 flex-wrap">
              {reptile.sex && <span className="text-xs bg-green-600 px-2 py-0.5 rounded-full">{sexLabel(reptile.sex)}</span>}
              {reptile.birthDate && <span className="text-xs bg-green-600 px-2 py-0.5 rounded-full">{calcAge(reptile.birthDate)}</span>}
              {reptile.enclosureName && <span className="text-xs bg-green-600 px-2 py-0.5 rounded-full">{reptile.enclosureName}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 flex overflow-x-auto">
        {tabs.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap px-1 ${
              tab === tb.key ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500'
            }`}>
            {tb.icon}{tb.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Link to={`/reptile/${id}/feed`}>
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <Utensils size={20} className="mx-auto text-orange-500 mb-1" />
                <p className="text-xs text-gray-500">{t('reptile.overview.lastFed')}</p>
                <p className="text-sm font-semibold text-gray-800">{formatRelativeTime(feedLogs[0]?.fedAt)}</p>
              </div>
            </Link>
            <Link to={`/reptile/${id}/health`}>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <Stethoscope size={20} className="mx-auto text-green-600 mb-1" />
                <p className="text-xs text-gray-500">{t('reptile.overview.lastWeight')}</p>
                <p className="text-sm font-semibold text-gray-800">
                  {weightLogs.length > 0 ? `${weightLogs[weightLogs.length - 1].weight} g` : t('common.noRecords')}
                </p>
              </div>
            </Link>
            <Link to={`/reptile/${id}/todos`}>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <CheckSquare size={20} className="mx-auto text-purple-500 mb-1" />
                <p className="text-xs text-gray-500">{t('reptile.overview.todoRules')}</p>
                <p className="text-sm font-semibold text-gray-800">{t('common.manage')}</p>
              </div>
            </Link>
          </div>
          {reptile.notes && (
            <Section title={t('common.notes')}>
              <Card className="mx-0">
                <p className="px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">{reptile.notes}</p>
              </Card>
            </Section>
          )}
        </div>
      )}

      {tab === 'feed' && (
        <div className="py-4">
          <div className="px-4 mb-3">
            <Link to={`/reptile/${id}/feed`}
              className="block w-full bg-green-600 text-white py-2.5 rounded-xl text-center font-medium text-sm">
              {t('feed.addRecord')}
            </Link>
          </div>
          {feedLogs.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">{t('common.noRecords')}</p>
          ) : (
            <Card className="mx-4">
              {feedLogs.slice(0, 20).map((l) => (
                <div key={l.id} className="px-4 py-3 border-b border-gray-100 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{l.foodType}</p>
                      <p className="text-xs text-gray-500">{l.amount}</p>
                    </div>
                    <p className="text-xs text-gray-400">{formatDateTime(l.fedAt)}</p>
                  </div>
                  {l.notes && <p className="text-xs text-gray-400 mt-1">{l.notes}</p>}
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {tab === 'medication' && (
        <div className="py-4">
          <div className="px-4 mb-3">
            <Link to={`/reptile/${id}/medication`}
              className="block w-full bg-green-600 text-white py-2.5 rounded-xl text-center font-medium text-sm">
              + {t('common.manage')}
            </Link>
          </div>
          <Section title={t('medication.coursesSection')}>
            {courses.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">{t('medication.noCourses')}</p>
            ) : (
              <Card className="mx-4">
                {courses.map((c) => (
                  <div key={c.id} className="px-4 py-3 border-b border-gray-100 last:border-0">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium text-gray-800">{c.drugName}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.active ? t('medication.active') : t('medication.inactive')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {c.dosage} · {c.ruleType === 'daily' ? t('medication.ruleDaily') : c.ruleType === 'hourly' ? t('medication.ruleHourly') : t('medication.ruleWeekly')}
                    </p>
                  </div>
                ))}
              </Card>
            )}
          </Section>
        </div>
      )}

      {tab === 'environment' && (
        <div className="py-4">
          <div className="px-4 mb-3">
            <Link to={`/reptile/${id}/environment`}
              className="block w-full bg-green-600 text-white py-2.5 rounded-xl text-center font-medium text-sm">
              + {t('environment.addRecord')}
            </Link>
          </div>
          <Section title={t('environment.habitatSection')}>
            {habitatLogs.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">{t('common.noRecords')}</p>
            ) : (
              <Card className="mx-4">
                {habitatLogs.slice(0, 10).map((l) => (
                  <div key={l.id} className="px-4 py-3 border-b border-gray-100 last:border-0 flex justify-between items-center">
                    <div>
                      {l.temperature != null && <span className="text-sm text-gray-800">{l.temperature} °C</span>}
                      {l.humidity != null && <span className="text-sm text-gray-500 ml-2">{l.humidity}%</span>}
                    </div>
                    <p className="text-xs text-gray-400">{formatDateTime(l.loggedAt)}</p>
                  </div>
                ))}
              </Card>
            )}
          </Section>
        </div>
      )}

      {tab === 'health' && (
        <div className="py-4 space-y-4 px-4">
          {(reptile.allergyInfo || reptile.chronicInfo) && (
            <Card>
              {reptile.allergyInfo && (
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">{t('health.allergyLabel')}</p>
                  <p className="text-sm text-gray-800">{reptile.allergyInfo}</p>
                </div>
              )}
              {reptile.chronicInfo && (
                <div className="px-4 py-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">{t('health.chronicLabel')}</p>
                  <p className="text-sm text-gray-800">{reptile.chronicInfo}</p>
                </div>
              )}
            </Card>
          )}
          <Link to={`/reptile/${id}/health`}
            className="block w-full bg-green-600 text-white py-2.5 rounded-xl text-center font-medium text-sm">
            + {t('health.addBtn')}
          </Link>
          <Section title={t('health.shedSection')}>
            {shedLogs.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">{t('common.noRecords')}</p>
            ) : (
              <Card className="mx-0">
                {shedLogs.slice(0, 5).map((l) => (
                  <div key={l.id} className="px-4 py-3 border-b border-gray-100 last:border-0">
                    <div className="flex justify-between items-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        l.status === 'complete' ? 'bg-green-100 text-green-700' :
                        l.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>{shedLabel(l.status)}</span>
                      <p className="text-xs text-gray-400">{formatDate(l.date)}</p>
                    </div>
                    {l.notes && <p className="text-xs text-gray-500 italic mt-1">{l.notes}</p>}
                  </div>
                ))}
              </Card>
            )}
          </Section>
          <Section title={t('health.visitSection')}>
            {visitLogs.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">{t('common.noRecords')}</p>
            ) : (
              <Card className="mx-0">
                {visitLogs.slice(0, 5).map((l) => (
                  <div key={l.id} className="px-4 py-3 border-b border-gray-100 last:border-0">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium text-gray-800">{l.summary}</p>
                      <p className="text-xs text-gray-400">{formatDate(l.date)}</p>
                    </div>
                    {l.notes && <p className="text-xs text-gray-400 mt-1">{l.notes}</p>}
                  </div>
                ))}
              </Card>
            )}
          </Section>
        </div>
      )}

      {showQr && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6" onClick={() => setShowQr(false)}>
          <div className="bg-white rounded-2xl p-6 space-y-4 max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-center text-gray-800">{t('reptile.qrTitle', { name: reptile.name })}</h3>
            <div className="flex justify-center">
              <QRCodeSVG value={reptile.qrTargetUrl || window.location.href} size={200} />
            </div>
            <p className="text-xs text-gray-400 text-center break-all">{reptile.qrTargetUrl}</p>
            <button onClick={() => setShowQr(false)} className="w-full bg-gray-100 py-2.5 rounded-xl text-gray-700 font-medium">
              {t('reptile.qrClose')}
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}
