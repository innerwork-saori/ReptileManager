import { Check, SkipForward } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TodoInstance } from '../db/schema'
import { todoInstanceRepo } from '../db/repos'
import { formatDateTime } from '../lib/todoEngine'

interface Props {
  item: TodoInstance
  reptileName?: string
  onUpdate: () => void
}

export function TodoItem({ item, reptileName, onUpdate }: Props) {
  const { t } = useTranslation()
  const isDone = item.status === 'done'
  const isSkipped = item.status === 'skipped'

  const markDone = async () => {
    await todoInstanceRepo.updateStatus(item.id, 'done')
    onUpdate()
  }

  const markSkipped = async () => {
    await todoInstanceRepo.updateStatus(item.id, 'skipped')
    onUpdate()
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 ${
        isDone || isSkipped ? 'opacity-50' : ''
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {item.label}
        </p>
        <div className="flex gap-2 items-center mt-0.5">
          {reptileName && (
            <span className="text-xs text-green-600 font-medium">{reptileName}</span>
          )}
          {item.dueAt && (
            <span className="text-xs text-gray-400">{formatDateTime(item.dueAt)}</span>
          )}
        </div>
      </div>

      {!isDone && !isSkipped && (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={markDone}
            className="p-2 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
          >
            <Check size={16} />
          </button>
          <button
            onClick={markSkipped}
            className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <SkipForward size={16} />
          </button>
        </div>
      )}

      {isDone && (
        <span className="text-xs text-green-600 font-medium shrink-0">{t('todoItem.done')}</span>
      )}
      {isSkipped && (
        <span className="text-xs text-gray-400 font-medium shrink-0">{t('todoItem.skipped')}</span>
      )}
    </div>
  )
}
