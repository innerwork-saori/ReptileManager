import { NavLink, useNavigate } from 'react-router-dom'
import { Home, List, ClipboardList, Egg, Settings, ArrowLeft, Menu, X, ListChecks, Tags } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
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
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleBack = () => {
    if (typeof back === 'string') navigate(back)
    else navigate(-1)
  }

  const navItems = [
    { to: '/', end: true,  icon: Home,          label: t('nav.home') },
    { to: '/reptiles',     icon: List,           label: t('nav.reptiles') },
    { to: '/feed',         icon: ClipboardList,  label: t('nav.log') },
    { to: '/breeding',     icon: Egg,            label: t('nav.breeding') },
    { to: '/backup',       icon: Settings,       label: t('nav.backup') },
  ]

  const drawerItems = [
    { to: '/', end: true,  icon: Home,          label: t('nav.home') },
    { to: '/reptiles',     icon: List,           label: t('nav.reptiles') },
    { to: '/feed',         icon: ClipboardList,  label: t('nav.log') },
    { to: '/breeding',     icon: Egg,            label: t('nav.breeding') },
    { to: '/backup',       icon: Settings,       label: t('nav.backup') },
  ]

  const closeDrawer = () => setDrawerOpen(false)

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {title && (
        <header className="sticky top-0 z-10 bg-surface border-b border-outline-variant px-4 h-16 flex items-center gap-3 shadow-sm">
          {back ? (
            <button onClick={handleBack} className="p-1 rounded-full hover:bg-surface-container transition-colors">
              <ArrowLeft size={20} className="text-on-surface" />
            </button>
          ) : (
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-1 rounded-full hover:bg-surface-container transition-colors"
              aria-label="Menu"
            >
              <Menu size={22} className="text-primary" />
            </button>
          )}
          <h1 className="flex-1 text-lg font-semibold truncate text-on-surface">{title}</h1>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}

      <main className="flex-1 pb-24 overflow-y-auto">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-outline-variant flex justify-around items-center px-4 py-2 rounded-t-xl shadow-lg z-40 safe-bottom will-change-transform" style={{ top: 'auto' }}>
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

      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Navigation drawer */}
      <aside
        className={`fixed left-0 top-0 h-screen w-[280px] bg-surface-container-low shadow-xl z-[60] flex flex-col transition-transform duration-300 ease-in-out ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-modal="true"
        role="dialog"
      >
        {/* Drawer header */}
        <div className="px-4 pt-10 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-1.5 rounded-lg">
              <ListChecks size={20} className="text-on-primary" />
            </div>
            <span className="text-base font-bold text-primary">ReptileManager</span>
          </div>
          <button
            onClick={closeDrawer}
            className="p-1.5 rounded-full hover:bg-surface-container transition-colors"
            aria-label="Close menu"
          >
            <X size={20} className="text-on-surface-variant" />
          </button>
        </div>

        {/* Drawer nav items */}
        <nav className="flex-1 px-2 py-2 flex flex-col gap-0.5 overflow-y-auto">
          {drawerItems.map(({ to, end, icon: Icon, label }) => (
            <NavLink
              key={to + label}
              to={to}
              end={end}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] duration-200 ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`
              }
            >
              <Icon size={22} />
              <span>{label}</span>
            </NavLink>
          ))}

          {/* Divider before todos */}
          <div className="mx-4 my-2 border-t border-outline-variant/50" />

          <NavLink
            to="/todos"
            onClick={closeDrawer}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] duration-200 ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`
            }
          >
            <ListChecks size={22} />
            <span>{t('nav.todos')}</span>
          </NavLink>

          <NavLink
            to="/categories"
            onClick={closeDrawer}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] duration-200 ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`
            }
          >
            <Tags size={22} />
            <span>{t('nav.categories')}</span>
          </NavLink>
        </nav>

        {/* Drawer footer */}
        <div className="p-4 border-t border-outline-variant/30">
          <p className="text-xs text-outline text-center opacity-60">ReptileManager</p>
        </div>
      </aside>
    </div>
  )
}
