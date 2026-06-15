import { useEffect, useRef, useState } from 'react'
import {
  Upload, Download, HardDrive, Activity, Utensils, Layers,
  QrCode, Printer, X, ChevronRight, AlertTriangle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { QRCodeCanvas } from 'qrcode.react'
import { Layout } from '../components/Layout'
import { exportAllData, importAllData, getDataSummary, resetAllData } from '../lib/backup'
import { reptileRepo } from '../db/repos'
import type { Reptile } from '../db/schema'

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const LANGUAGES = [
  { code: 'zh-TW', label: '繁中' },
  { code: 'en',    label: 'EN' },
]

export function BackupPage() {
  const { t, i18n } = useTranslation()
  const [summary, setSummary] = useState({ reptiles: 0, feedLogs: 0, medicationLogs: 0, otherRecords: 0, total: 0 })
  const [dataSize, setDataSize] = useState('–')
  const [exporting, setExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<'success' | 'error' | null>(null)
  const [resetting, setResetting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [qrExportOpen, setQrExportOpen] = useState(false)
  const [qrReptiles, setQrReptiles] = useState<Reptile[]>([])
  const [loadingQr, setLoadingQr] = useState(false)
  const qrContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void getDataSummary().then(setSummary)
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      void navigator.storage.estimate().then(({ usage }) => {
        if (usage !== undefined) setDataSize(formatSize(usage))
      })
    }
  }, [])

  const handleExport = async () => {
    setExporting(true)
    setExportSuccess(false)
    try {
      await exportAllData()
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
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

  const handleReset = async () => {
    if (!window.confirm(t('backup.resetConfirm'))) return
    setResetting(true)
    try {
      await resetAllData()
      window.location.reload()
    } catch {
      setResetting(false)
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

  const isZhTW = i18n.language === 'zh-TW' || i18n.language === 'zh'

  const stats = [
    { Icon: Layers,   value: summary.reptiles,    label: t('backup.reptilesCount'),  sub: 'Reptiles Count' },
    { Icon: Utensils, value: summary.feedLogs,    label: t('backup.feedingsLogged'), sub: 'Feedings Logged' },
    { Icon: Activity, value: summary.otherRecords, label: t('backup.healthChecks'),  sub: 'Health Records' },
    { Icon: HardDrive, value: dataSize,            label: t('backup.dataSizeLabel'), sub: 'Total Data Size' },
  ]

  return (
    <Layout title={t('backup.title')}>
      <div className="px-4 pt-6 pb-32 max-w-lg mx-auto space-y-6">

        {/* Language */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between bg-surface-container-lowest border border-outline-variant p-4 rounded-xl shadow-sm">
            <div>
              <p className="text-sm font-semibold text-on-surface">{t('backup.langSettings')}</p>
              <p className="text-[10px] text-on-surface-variant">Language Settings</p>
            </div>
            <div className="flex bg-surface-container-high rounded-lg p-1 gap-0.5">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    (lang.code === 'zh-TW' && isZhTW) || (lang.code === 'en' && !isZhTW)
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Data Statistics Bento Grid */}
        <section>
          <h2 className="text-xl font-semibold text-primary mb-0.5">{t('backup.dataOverview')}</h2>
          <p className="text-[10px] text-on-surface-variant mb-4">Data Statistics Overview</p>
          <div className="grid grid-cols-2 gap-2">
            {stats.map(({ Icon, value, label, sub }) => (
              <div key={label} className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex flex-col gap-1 shadow-sm">
                <Icon size={20} className="text-secondary" />
                <span className="text-2xl font-bold text-primary">{value}</span>
                <div>
                  <p className="text-xs font-semibold text-on-surface">{label}</p>
                  <p className="text-[10px] text-on-surface-variant">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Backup & Sync */}
        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold text-primary">{t('backup.backupSyncTitle')}</h2>
            <p className="text-[10px] text-on-surface-variant">Backup & Sync</p>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-between p-4 bg-primary-container text-on-primary-container rounded-xl shadow-sm active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            <div className="flex items-center gap-4">
              <Upload size={20} />
              <div className="text-left">
                <p className="text-sm font-semibold">{t('backup.exportDbLabel')}</p>
                <p className="text-[10px] opacity-80">Export Database (JSON)</p>
              </div>
            </div>
            <ChevronRight size={20} />
          </button>
          {exportSuccess && (
            <p className="text-center text-sm text-primary font-medium">{t('backup.exportSuccess')}</p>
          )}

          <button
            onClick={handleOpenQrExport}
            disabled={loadingQr}
            className="w-full flex items-center justify-between p-4 bg-primary-container text-on-primary-container rounded-xl shadow-sm active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            <div className="flex items-center gap-4">
              <QrCode size={20} />
              <div className="text-left">
                <p className="text-sm font-semibold">
                  {loadingQr ? t('backup.qrExporting') : t('backup.qrAllLabel')}
                </p>
                <p className="text-[10px] opacity-80">Export All QR Codes</p>
              </div>
            </div>
            <ChevronRight size={20} />
          </button>

          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="w-full flex items-center justify-between p-4 bg-secondary text-white rounded-xl shadow-sm active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            <div className="flex items-center gap-4">
              <Download size={20} />
              <div className="text-left">
                <p className="text-sm font-semibold">
                  {importing ? t('backup.importing') : t('backup.importFileLabel')}
                </p>
                <p className="text-[10px] opacity-80">Import Backup File</p>
              </div>
            </div>
            <ChevronRight size={20} />
          </button>
          {importResult === 'success' && (
            <p className="text-center text-sm text-primary font-medium">{t('backup.importSuccess')}</p>
          )}
          {importResult === 'error' && (
            <p className="text-center text-sm text-red-500 font-medium">{t('backup.importError')}</p>
          )}
        </section>

        {/* Danger Zone */}
        <section className="pt-4 border-t border-outline-variant">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={20} className="text-red-600" />
            <h2 className="text-xl font-semibold text-red-600">{t('backup.dangerZoneTitle')}</h2>
          </div>
          <p className="text-[10px] text-on-surface-variant mb-4">{t('backup.dangerZoneDesc')}</p>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-red-500 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-60"
          >
            <p className="text-sm font-semibold text-red-600">{t('backup.resetAllLabel')}</p>
            <p className="text-[10px] text-red-400 mt-0.5">{t('backup.resetAllSub')}</p>
          </button>
        </section>

      </div>

      {/* QR Export Modal */}
      {qrExportOpen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
            <h2 className="font-semibold text-on-surface">{t('backup.qrExportTitle')}</h2>
            <button onClick={() => setQrExportOpen(false)} className="p-1 text-on-surface-variant">
              <X size={22} />
            </button>
          </div>
          <div className="px-4 py-3 border-b border-outline-variant">
            <button
              onClick={handlePrintQr}
              className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-3 rounded-xl font-semibold"
            >
              <Printer size={18} />
              {t('backup.qrExportPrint')}
            </button>
          </div>
          <div ref={qrContainerRef} className="flex-1 overflow-y-auto p-4">
            {qrReptiles.length === 0 ? (
              <p className="text-center text-on-surface-variant py-12">{t('reptile.noReptiles')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {qrReptiles.map(r => (
                  <div key={r.id} className="flex flex-col items-center border border-outline-variant rounded-xl p-3 gap-2">
                    <QRCodeCanvas
                      value={r.qrTargetUrl || `${window.location.origin}${window.location.pathname}#/reptile/${r.id}`}
                      size={130}
                    />
                    <p className="text-sm font-semibold text-center text-on-surface leading-tight">{r.name}</p>
                    <p className="text-xs text-on-surface-variant text-center leading-tight">{r.species}</p>
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
