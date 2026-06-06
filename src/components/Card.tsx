import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className = '', onClick }: Props) {
  const base = 'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'
  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} w-full text-left active:bg-gray-50 ${className}`}>
        {children}
      </button>
    )
  }
  return <div className={`${base} ${className}`}>{children}</div>
}

interface SectionProps {
  title: string
  action?: ReactNode
  children: ReactNode
}

export function Section({ title, action, children }: SectionProps) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between px-4 mb-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}
