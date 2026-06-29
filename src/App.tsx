import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { HomePage } from './pages/HomePage'
import { ReptilesPage } from './pages/ReptilesPage'
import { ReptileDetailPage } from './pages/ReptileDetailPage'
import { ReptileFormPage } from './pages/ReptileFormPage'
import { FeedLogPage } from './pages/FeedLogPage'
import { MedicationPage } from './pages/MedicationPage'
import { EnvironmentPage } from './pages/EnvironmentPage'
import { HealthPage } from './pages/HealthPage'
import { TodoRulesPage } from './pages/TodoRulesPage'
import { BackupPage } from './pages/BackupPage'
import { ClutchFormPage } from './pages/ClutchFormPage'
import { ClutchDetailPage } from './pages/ClutchDetailPage'
import { BreedingPage } from './pages/BreedingPage'
import { FeedQuickPage } from './pages/FeedQuickPage'
import { ActivityLogPage } from './pages/ActivityLogPage'
import { TodosPage } from './pages/TodosPage'
import { TasksPage } from './pages/TasksPage'
import { CategoriesPage } from './pages/CategoriesPage'

function ScrollToTop() {
  const { pathname, state } = useLocation()

  useEffect(() => {
    const restoreReptileId = (state as { restoreReptileId?: string } | null)?.restoreReptileId
    if (pathname === '/reptiles' && restoreReptileId) return
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

function UpdatePrompt() {
  const { t } = useTranslation()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-20 inset-x-4 z-50 bg-green-700 text-white rounded-xl shadow-lg flex items-center gap-3 px-4 py-3">
      <p className="flex-1 text-sm">{t('pwa.newVersion')}</p>
      <button
        onClick={() => updateServiceWorker(true)}
        className="shrink-0 bg-white text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium"
      >
        {t('pwa.update')}
      </button>
      <button onClick={() => setNeedRefresh(false)} className="shrink-0 text-green-200 text-sm">
        {t('pwa.later')}
      </button>
    </div>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  if (!ready) return null

  return (
    <HashRouter>
      <ScrollToTop />
      <UpdatePrompt />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/reptiles" element={<ReptilesPage />} />
        <Route path="/reptile/new" element={<ReptileFormPage />} />
        <Route path="/reptile/:id" element={<ReptileDetailPage />} />
        <Route path="/reptile/:id/edit" element={<ReptileFormPage />} />
        <Route path="/reptile/:id/feed" element={<FeedLogPage />} />
        <Route path="/reptile/:id/logs" element={<ActivityLogPage />} />
        <Route path="/reptile/:id/medication" element={<MedicationPage />} />
        <Route path="/reptile/:id/environment" element={<EnvironmentPage />} />
        <Route path="/reptile/:id/health" element={<HealthPage />} />
        <Route path="/reptile/:id/todos" element={<TodoRulesPage />} />
        <Route path="/reptile/:id/clutch" element={<ClutchFormPage />} />
        <Route path="/feed" element={<FeedQuickPage />} />
        <Route path="/breeding" element={<BreedingPage />} />
        <Route path="/breeding/:id" element={<ClutchDetailPage />} />
        <Route path="/todos" element={<TodosPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/backup" element={<BackupPage />} />
      </Routes>
    </HashRouter>
  )
}
