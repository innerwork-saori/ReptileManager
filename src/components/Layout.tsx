import { NavLink, useNavigate } from 'react-router-dom'
import { Home, List, Settings, ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  title?: string
  back?: string | boolean
  action?: ReactNode
}

export function Layout({ children, title, back, action }: Props) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleBack = () => {
    if (typeof back === 'string') navigate(back)
    else navigate(-1)
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {title && (
        <header className="sticky top-0 z-10 bg-surface border-b border-outline-variant px-4 h-16 flex items-center gap-3 shadow-sm">
          {back && (
            <button onClick={handleBack} className="p-1 rounded-full hover:bg-surface-container transition-colors">
              <ArrowLeft size={20} className="text-on-surface" />
            </button>
          )}
          <h1 className="flex-1 text-lg font-semibold truncate text-on-surface">{title}</h1>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}

      <main className="flex-1 pb-24">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 bg-surface border-t border-outline-variant flex safe-bottom rounded-t-xl shadow-lg z-40">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center pt-2 pb-1 text-xs gap-0.5 transition-colors ${
              isActive ? 'text-primary' : 'text-on-surface-variant'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`px-4 py-1 rounded-full transition-colors ${isActive ? 'bg-primary-container' : ''}`}>
                <Home size={22} />
              </div>
              <span className="font-medium">{t('nav.home')}</span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/reptiles"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center pt-2 pb-1 text-xs gap-0.5 transition-colors ${
              isActive ? 'text-primary' : 'text-on-surface-variant'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`px-4 py-1 rounded-full transition-colors ${isActive ? 'bg-primary-container' : ''}`}>
                <List size={22} />
              </div>
              <span className="font-medium">{t('nav.reptiles')}</span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/backup"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center pt-2 pb-1 text-xs gap-0.5 transition-colors ${
              isActive ? 'text-primary' : 'text-on-surface-variant'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`px-4 py-1 rounded-full transition-colors ${isActive ? 'bg-primary-container' : ''}`}>
                <Settings size={22} />
              </div>
              <span className="font-medium">{t('nav.backup')}</span>
            </>
          )}
        </NavLink>
      </nav>
    </div>
  )
}
