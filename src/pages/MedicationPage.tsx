import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { Card, Section } from '../components/Card'
import { InputField, SelectField, TextareaField } from '../components/FormField'
import { medicationCourseRepo, medicationLogRepo, reptileRepo } from '../db/repos'
import type { MedicationCourse, MedicationLog } from '../db/schema'
import { formatDateTime, formatDate } from '../lib/todoEngine'

export function MedicationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [reptileName, setReptileName] = useState('')
  const [courses, setCourses] = useState<MedicationCourse[]>([])
  const [logs, setLogs] = useState<MedicationLog[]>([])
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null)

  const [courseForm, setCourseForm] = useState({
    drugName: '', dosage: '', ruleType: 'daily', intervalHours: '8', weeklyDays: '',
    startDate: new Date().toISOString().slice(0, 10), endDate: '', notes: '',
  })
  const [logForm, setLogForm] = useState({
    takenAt: new Date().toISOString().slice(0, 16),
    drugName: '', dosage: '', courseId: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  const RULE_TYPE_OPTIONS = [
    { value: 'daily', label: t('medication.daily') },
    { value: 'hourly', label: t('medication.hourly') },
    { value: 'weekly', label: t('medication.weekly') },
  ]

  const load = useCallback(async () => {
    if (!id) return
    const [r, c, l] = await Promise.all([
      reptileRepo.getById(id),
      medicationCourseRepo.getByReptile(id),
      medicationLogRepo.getByReptile(id),
    ])
    if (!r) { navigate('/reptiles'); return }
    setReptileName(r.name)
    setCourses(c)
    setLogs(l)
  }, [id, navigate])

  useEffect(() => { void load() }, [load])

  const setCF = (key: keyof typeof courseForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setCourseForm((f) => ({ ...f, [key]: e.target.value }))

  const setLF = (key: keyof typeof logForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setLogForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseForm.drugName.trim() || !id) return
    setSaving(true)
    const ruleConfig: Record<string, unknown> =
      courseForm.ruleType === 'hourly' ? { intervalHours: Number(courseForm.intervalHours) } :
      courseForm.ruleType === 'weekly' ? { days: courseForm.weeklyDays.split(',').map(Number) } : {}
    await medicationCourseRepo.create({
      reptileId: id,
      drugName: courseForm.drugName.trim(),
      dosage: courseForm.dosage.trim(),
      ruleType: courseForm.ruleType as MedicationCourse['ruleType'],
      ruleConfig,
      startDate: courseForm.startDate,
      endDate: courseForm.endDate || undefined,
      active: true,
      notes: courseForm.notes.trim() || undefined,
    })
    setCourseForm({ drugName: '', dosage: '', ruleType: 'daily', intervalHours: '8', weeklyDays: '', startDate: new Date().toISOString().slice(0, 10), endDate: '', notes: '' })
    setShowCourseForm(false)
    await load()
    setSaving(false)
  }

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!logForm.drugName.trim() || !id) return
    setSaving(true)
    await medicationLogRepo.create({
      reptileId: id,
      courseId: logForm.courseId || undefined,
      takenAt: new Date(logForm.takenAt).toISOString(),
      drugName: logForm.drugName.trim(),
      dosage: logForm.dosage.trim(),
      notes: logForm.notes.trim() || undefined,
    })
    setLogForm({ takenAt: new Date().toISOString().slice(0, 16), drugName: '', dosage: '', courseId: '', notes: '' })
    setShowLogForm(false)
    await load()
    setSaving(false)
  }

  const toggleCourseActive = async (course: MedicationCourse) => {
    await medicationCourseRepo.update(course.id, { active: !course.active })
    await load()
  }

  const ruleLabel = (ruleType: string) => {
    if (ruleType === 'daily') return t('medication.ruleDaily')
    if (ruleType === 'hourly') return t('medication.ruleHourly')
    return t('medication.ruleWeekly')
  }

  return (
    <Layout title={`${reptileName} · ${t('medication.title')}`} back={`/reptile/${id}`}>
      <div className="px-4 pt-4 flex gap-2">
        <button onClick={() => { setShowCourseForm(!showCourseForm); setShowLogForm(false) }}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium">
          <Plus size={16} />{t('medication.addCourse')}
        </button>
        <button onClick={() => { setShowLogForm(!showLogForm); setShowCourseForm(false) }}
          className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium">
          <Plus size={16} />{t('medication.addLog')}
        </button>
      </div>

      {showCourseForm && (
        <form onSubmit={handleSaveCourse} className="mx-4 mt-3 bg-blue-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-blue-800 text-sm">{t('medication.courseFormTitle')}</h3>
          <InputField label={t('medication.drugName')} required value={courseForm.drugName} onChange={setCF('drugName')} />
          <InputField label={t('medication.dosage')} value={courseForm.dosage} onChange={setCF('dosage')} placeholder={t('medication.dosagePlaceholder')} />
          <SelectField label={t('medication.ruleType')} value={courseForm.ruleType} onChange={setCF('ruleType')} options={RULE_TYPE_OPTIONS} />
          {courseForm.ruleType === 'hourly' && (
            <InputField label={t('medication.intervalHours')} type="number" value={courseForm.intervalHours} onChange={setCF('intervalHours')} />
          )}
          {courseForm.ruleType === 'weekly' && (
            <InputField label={t('medication.weeklyDaysLabel')} value={courseForm.weeklyDays} onChange={setCF('weeklyDays')} placeholder={t('medication.weeklyDaysPlaceholder')} />
          )}
          <InputField label={t('medication.startDate')} type="date" required value={courseForm.startDate} onChange={setCF('startDate')} />
          <InputField label={t('medication.endDate')} type="date" value={courseForm.endDate} onChange={setCF('endDate')} />
          <TextareaField label={t('common.notes')} value={courseForm.notes} onChange={setCF('notes')} />
          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
            {saving ? t('common.saving') : t('medication.addCourseBtn')}
          </button>
        </form>
      )}

      {showLogForm && (
        <form onSubmit={handleSaveLog} className="mx-4 mt-3 bg-green-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-green-800 text-sm">{t('medication.logFormTitle')}</h3>
          <InputField label={t('common.time')} type="datetime-local" required value={logForm.takenAt} onChange={setLF('takenAt')} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">{t('medication.linkedCourse')}</label>
            <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={logForm.courseId} onChange={setLF('courseId')}>
              <option value="">{t('medication.noCourse')}</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.drugName}</option>)}
            </select>
          </div>
          <InputField label={t('medication.drugName')} required value={logForm.drugName} onChange={setLF('drugName')} />
          <InputField label={t('medication.dosage')} value={logForm.dosage} onChange={setLF('dosage')} />
          <TextareaField label={t('common.notes')} value={logForm.notes} onChange={setLF('notes')} />
          <button type="submit" disabled={saving}
            className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
            {saving ? t('common.saving') : t('medication.addLogBtn')}
          </button>
        </form>
      )}

      <Section title={t('medication.coursesSection')}>
        {courses.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">{t('medication.noCourses')}</p>
        ) : (
          <Card className="mx-4">
            {courses.map((c) => (
              <div key={c.id} className="border-b border-gray-100 last:border-0">
                <button className="w-full flex items-center gap-3 px-4 py-3"
                  onClick={() => setExpandedCourse(expandedCourse === c.id ? null : c.id)}>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-800">{c.drugName}</p>
                    <p className="text-xs text-gray-500">{c.dosage} · {ruleLabel(c.ruleType)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.active ? t('medication.active') : t('medication.inactive')}
                  </span>
                  {expandedCourse === c.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>
                {expandedCourse === c.id && (
                  <div className="px-4 pb-3 space-y-2 bg-gray-50">
                    {c.startDate && <p className="text-xs text-gray-500">{t('medication.startDate')}：{formatDate(c.startDate)}</p>}
                    {c.endDate && <p className="text-xs text-gray-500">{t('medication.endDate')}：{formatDate(c.endDate)}</p>}
                    {c.notes && <p className="text-xs text-gray-500">{c.notes}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => toggleCourseActive(c)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${c.active ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                        {c.active ? t('medication.markInactive') : t('medication.reactivate')}
                      </button>
                      <button onClick={() => medicationCourseRepo.delete(c.id).then(load)}
                        className="p-1.5 text-gray-400 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </Card>
        )}
      </Section>

      <Section title={t('medication.logsSection')}>
        {logs.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">{t('medication.noLogs')}</p>
        ) : (
          <Card className="mx-4">
            {logs.slice(0, 20).map((l) => (
              <div key={l.id} className="px-4 py-3 border-b border-gray-100 last:border-0 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{l.drugName}</p>
                  <p className="text-xs text-gray-500">{l.dosage} · {formatDateTime(l.takenAt)}</p>
                </div>
                <button onClick={() => medicationLogRepo.delete(l.id).then(load)} className="p-1.5 text-gray-300 hover:text-red-400">
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
