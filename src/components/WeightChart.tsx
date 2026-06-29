import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import type { WeightLog } from '../db/schema'

interface Props {
  logs: WeightLog[]
}

export function WeightChart({ logs }: Props) {
  const { t } = useTranslation()
  const chartGrid = 'var(--color-outline-variant)'
  const chartLine = 'var(--color-primary)'

  if (logs.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-6">{t('common.noRecords')}</p>
  }

  const data = logs.map((l) => ({
    date: l.date.slice(5),
    weight: l.weight,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit="g" />
        <Tooltip
          formatter={(v: number) => [`${v} g`, t('health.weight')]}
          labelFormatter={(l) => `${t('common.date')}: ${l}`}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke={chartLine}
          strokeWidth={2}
          dot={{ r: 3, fill: chartLine }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
