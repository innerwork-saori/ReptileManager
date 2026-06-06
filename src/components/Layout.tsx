import { NavLink, useNavigate } from 'react-router-dom'
import { Home, List, Download, ArrowLeft } from 'lucide-react'
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
    <div className="flex flex-col min-h-screen bg-gray-50">
      {title && (
        <header className="sticky top-0 z-10 bg-green-700 text-white px-4 py-3 flex items-center gap-3 shadow-md">
          {back && (
            <button onClick={handleBack} className="p-1 rounded-full hover:bg-green-600 transition-colors">
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="flex-1 text-lg font-semibold truncate">{title}</h1>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}

      <main className="flex-1 pb-20">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex safe-bottom">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 text-xs gap-0.5 transition-colors ${
              isActive ? 'text-green-700' : 'text-gray-500'
            }`
          }
        >
          <Home size={22} />
          <span>{t('nav.home')}</span>
        </NavLink>
        <NavLink
          to="/reptiles"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 text-xs gap-0.5 transition-colors ${
              isActive ? 'text-green-700' : 'text-gray-500'
            }`
          }
        >
          <List size={22} />
          <span>{t('nav.reptiles')}</span>
        </NavLink>
        <NavLink
          to="/backup"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 text-xs gap-0.5 transition-colors ${
              isActive ? 'text-green-700' : 'text-gray-500'
            }`
          }
        >
          <Download size={22} />
          <span>{t('nav.backup')}</span>
        </NavLink>
      </nav>
    </div>
  )
}
