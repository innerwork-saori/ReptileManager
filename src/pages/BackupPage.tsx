import { useEffect, useRef, useState } from 'react'
import { Download, Upload, Database, AlertTriangle, QrCode, Printer, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { QRCodeCanvas } from 'qrcode.react'
import { Layout } from '../components/Layout'
import { Card, Section } from '../components/Card'
import { exportAllData, importAllData, getDataSummary } from '../lib/backup'
import { reptileRepo } from '../db/repos'
import type { Reptile } from '../db/schema'

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

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
  const [qrExportOpen, setQrExportOpen] = useState(false)
  const [qrReptiles, setQrReptiles] = useState<Reptile[]>([])
  const [loadingQr, setLoadingQr] = useState(false)
  const qrContainerRef = useRef<HTMLDivElement>(null)

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

  const handleOpenQrExport = async () => {
    setLoadingQr(true)
    try {
      const reptiles = await reptileRepo.getAll()
      setQrReptiles(reptiles)
      setQrExportOpen(true)
    } finally {
      setLoadingQr(false)
    }
  }

  const handlePrintQr = () => {
    const container = qrContainerRef.current
    if (!container) return
    const canvases = container.querySelectorAll('canvas')
    const items = qrReptiles.map((r, i) => ({
      name: r.name,
      species: r.species,
      url: (canvases[i] as HTMLCanvasElement)?.toDataURL('image/png') ?? '',
    })).filter(d => d.url)

    const pw = window.open('', '_blank')
    if (!pw) return

    pw.document.write(`<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>ReptileManager QR Codes</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#fff;padding:20px}
h1{font-size:16px;font-weight:700;margin-bottom:16px;color:#333}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
.card{border:1px solid #e5e7eb;border-radius:10px;padding:12px;display:flex;flex-direction:column;align-items:center;gap:6px}
.card img{width:130px;height:130px}
.name{font-size:13px;font-weight:600;color:#111;text-align:center}
.sp{font-size:11px;color:#6b7280;text-align:center}
@media print{@page{margin:1cm}body{padding:0}}
</style>
</head>
<body>
<h1>ReptileManager QR Codes</h1>
<div class="grid">${items.map(d => `<div class="card"><img src="${d.url}" alt="${escapeHtml(d.name)}"><p class="name">${escapeHtml(d.name)}</p><p class="sp">${escapeHtml(d.species)}</p></div>`).join('')}</div>
<script>window.onload=function(){window.print()}<\/script>
</body>
</html>`)
    pw.document.close()
  }

  return (
    <Layout title={t('backup.title')}>
      <div className="px-4 pt-4 pb-6 space-y-4">
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

        <Section title={t('backup.qrExportSection')}>
          <Card>
            <div className="p-4">
              <button onClick={handleOpenQrExport} disabled={loadingQr}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-60 transition-colors">
                <QrCode size={18} />
                {loadingQr ? t('backup.qrExporting') : t('backup.qrExportBtn')}
              </button>
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
      {qrExportOpen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">{t('backup.qrExportTitle')}</h2>
            <button onClick={() => setQrExportOpen(false)} className="p-1 text-gray-500">
              <X size={22} />
            </button>
          </div>
          <div className="px-4 py-3 border-b border-gray-100">
            <button onClick={handlePrintQr}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-semibold">
              <Printer size={18} />
              {t('backup.qrExportPrint')}
            </button>
          </div>
          <div ref={qrContainerRef} className="flex-1 overflow-y-auto p-4">
            {qrReptiles.length === 0 ? (
              <p className="text-center text-gray-400 py-12">{t('reptile.noReptiles')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {qrReptiles.map(r => (
                  <div key={r.id} className="flex flex-col items-center border border-gray-200 rounded-xl p-3 gap-2">
                    <QRCodeCanvas
                      value={r.qrTargetUrl || `${window.location.origin}${window.location.pathname}#/reptile/${r.id}`}
                      size={130}
                    />
                    <p className="text-sm font-semibold text-center text-gray-800 leading-tight">{r.name}</p>
                    <p className="text-xs text-gray-500 text-center leading-tight">{r.species}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
