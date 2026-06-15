import { NavLink, useNavigate } from 'react-router-dom'
import { Home, List, PlusCircle, Egg, Settings, ArrowLeft } from 'lucide-react'
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

  const navItems = [
    { to: '/', end: true,  icon: Home,       label: t('nav.home') },
    { to: '/reptiles',     icon: List,        label: t('nav.reptiles') },
    { to: '/reptile/new',  icon: PlusCircle,  label: t('nav.log') },
    { to: '/breeding',     icon: Egg,         label: t('nav.breeding') },
    { to: '/backup',       icon: Settings,    label: t('nav.backup') },
  ]

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

      <nav className="fixed bottom-0 inset-x-0 bg-surface border-t border-outline-variant flex justify-around items-center px-4 py-2 rounded-t-xl shadow-lg z-40 safe-bottom">
        {navItems.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to + label}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-90 duration-200 ${
                isActive
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`
            }
          >
            <Icon size={22} />
            <span className="mt-0.5 tracking-wide">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
