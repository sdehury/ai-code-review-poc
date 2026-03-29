import { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'blue' | 'red' | 'orange' | 'green' | 'purple'
  subtitle?: string
  testId?: string
}

const colorMap = {
  blue:   'text-blue-400 bg-blue-900/30',
  red:    'text-red-400 bg-red-900/30',
  orange: 'text-orange-400 bg-orange-900/30',
  green:  'text-green-400 bg-green-900/30',
  purple: 'text-purple-400 bg-purple-900/30',
}

export default function KPICard({ title, value, icon: Icon, color = 'blue', subtitle, testId }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-start gap-4"
      data-testid={testId ?? 'kpi-card'}>
      <div className={clsx('p-2.5 rounded-lg', colorMap[color])}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
