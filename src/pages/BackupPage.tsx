import { useEffect, useRef, useState } from 'react'
import { Download, Upload, Database, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { Card, Section } from '../components/Card'
import { exportAllData, importAllData, getDataSummary } from '../lib/backup'

const LANGUAGES = [
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'en', label: 'English' },
]

export function BackupPage() {
  const { t, i18n } = useTranslation()
  const [summary, setSummary] = useState({ reptiles: 0, feedLogs: 0, medicationLogs: 0, otherRecords: 0, total: 0 })
  const [exporting, setExporting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<'success' | 'error' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getDataSummary().then(setSummary)
  }, [])

  const handleExport = async () => {
    setExporting(true)
    setSuccess(false)
    try {
      await exportAllData()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (!window.confirm(t('backup.importConfirm'))) return
    setImporting(true)
    setImportResult(null)
    try {
      await importAllData(file)
      setImportResult('success')
      setTimeout(() => window.location.reload(), 1500)
    } catch {
      setImportResult('error')
      setImporting(false)
    }
  }

  const handleLanguageChange = (code: string) => {
    void i18n.changeLanguage(code)
  }

  return (
    <Layout title={t('backup.title')}>
      <div className="px-4 pt-4 space-y-4">
        <Section title={t('backup.languageSection')}>
          <Card>
            <div className="px-4 py-3">
              <p className="text-sm text-gray-500 mb-3">{t('backup.languageLabel')}</p>
              <div className="flex gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${
                      i18n.language === lang.code || (lang.code === 'zh-TW' && i18n.language === 'zh')
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </Section>

        <Section title={t('backup.statsSection')}>
          <Card>
            <div className="grid grid-cols-2 gap-0">
              {[
                { label: t('backup.reptiles'), value: summary.reptiles },
                { label: t('backup.feedLogs'), value: summary.feedLogs },
                { label: t('backup.medicationLogs'), value: summary.medicationLogs },
                { label: t('backup.otherRecords'), value: summary.otherRecords },
              ].map((item) => (
                <div key={item.label} className="p-4 border-b border-r border-gray-100 last:border-r-0 even:border-r-0">
                  <p className="text-2xl font-bold text-green-700">{item.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Database size={14} className="text-gray-500" />
                <p className="text-sm text-gray-600">{t('backup.totalLabel', { count: summary.total })}</p>
              </div>
            </div>
          </Card>
        </Section>

        <Section title={t('backup.exportSection')}>
          <Card>
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3 bg-amber-50 rounded-lg p-3">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">{t('backup.warning')}</p>
              </div>
              <button onClick={handleExport} disabled={exporting}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-60 transition-colors">
                <Download size={18} />
                {exporting ? t('backup.exporting') : t('backup.exportBtn')}
              </button>
              {success && (
                <p className="text-center text-sm text-green-600 font-medium">{t('backup.exportSuccess')}</p>
              )}
            </div>
          </Card>
        </Section>

        <Section title={t('backup.importSection')}>
          <Card>
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3 bg-amber-50 rounded-lg p-3">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">{t('backup.importWarning')}</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="w-full flex items-center justify-center gap-2 bg-green-700 text-white py-3 rounded-xl font-semibold disabled:opacity-60 transition-colors"
              >
                <Upload size={18} />
                {importing ? t('backup.importing') : t('backup.importBtn')}
              </button>
              {importResult === 'success' && (
                <p className="text-center text-sm text-green-600 font-medium">{t('backup.importSuccess')}</p>
              )}
              {importResult === 'error' && (
                <p className="text-center text-sm text-red-500 font-medium">{t('backup.importError')}</p>
              )}
            </div>
          </Card>
        </Section>

        <Section title={t('backup.aboutSection')}>
          <Card>
            <div className="px-4 py-3 space-y-1">
              <p className="text-sm font-medium text-gray-800">{t('backup.appName')}</p>
              <p className="text-xs text-gray-500">{t('backup.version')}</p>
              <p className="text-xs text-gray-400">{t('backup.description')}</p>
            </div>
          </Card>
        </Section>
      </div>
    </Layout>
  )
}
