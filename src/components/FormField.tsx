import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface BaseProps {
  label: string
  error?: string
  required?: boolean
}

type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement>
type SelectProps = BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }
type TextareaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>

const fieldCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'

export function InputField({ label, error, required, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input className={`${fieldCls} ${error ? 'border-red-400' : ''}`} {...props} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function SelectField({ label, error, required, options, ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select className={`${fieldCls} ${error ? 'border-red-400' : ''}`} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function TextareaField({ label, error, required, ...props }: TextareaProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea rows={3} className={`${fieldCls} resize-none ${error ? 'border-red-400' : ''}`} {...props} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
