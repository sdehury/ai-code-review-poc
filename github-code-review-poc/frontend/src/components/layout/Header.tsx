import { useQuery } from '@tanstack/react-query'
import { getHealth } from '../../services/api'
import { Activity } from 'lucide-react'

export default function Header() {
  const { data, isError } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 60_000,
  })

  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-sm font-medium text-gray-300">
        Enterprise Java Code Review Platform
      </h1>
      <div className="flex items-center gap-2 text-xs">
        <Activity size={14} className={isError ? 'text-red-400' : 'text-green-400'} />
        <span className={isError ? 'text-red-400' : 'text-green-400'} data-testid="api-status">
          {isError ? 'API Offline' : `API ${data?.status ?? 'checking...'}`}
        </span>
      </div>
    </header>
  )
}
