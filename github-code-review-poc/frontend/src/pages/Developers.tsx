import { useQuery } from '@tanstack/react-query'
import { getDevelopers } from '../services/api'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { Users, GitCommit, Plus, Minus } from 'lucide-react'
import clsx from 'clsx'

function RiskBadge({ score }: { score: number }) {
  const { label, cls } = score >= 50 ? { label: 'CRITICAL', cls: 'bg-red-900/40 text-red-300' }
    : score >= 25 ? { label: 'HIGH', cls: 'bg-orange-900/40 text-orange-300' }
    : score >= 10 ? { label: 'MEDIUM', cls: 'bg-yellow-900/40 text-yellow-300' }
    : { label: 'LOW', cls: 'bg-green-900/40 text-green-300' }
  return <span className={clsx('px-2 py-0.5 rounded text-xs font-semibold', cls)} data-testid="risk-badge">{label}</span>
}

export default function Developers() {
  const { data: devs, isLoading } = useQuery({ queryKey: ['developers'], queryFn: () => getDevelopers(100) })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6" data-testid="developers-page">
      <div>
        <h2 className="text-xl font-bold text-white">Developers</h2>
        <p className="text-sm text-gray-400 mt-1">{devs?.length ?? 0} contributors tracked</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {!devs || devs.length === 0 ? (
          <div className="p-10 text-center">
            <Users size={36} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-300">No developers tracked yet</p>
            <p className="text-gray-500 text-sm mt-1">Run a review to populate developer data</p>
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="developers-table">
            <thead className="bg-gray-800/50">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Developer</th>
                <th className="px-4 py-3 font-medium">Commits</th>
                <th className="px-4 py-3 font-medium">Changes</th>
                <th className="px-4 py-3 font-medium">Critical</th>
                <th className="px-4 py-3 font-medium">High</th>
                <th className="px-4 py-3 font-medium">Risk Score</th>
                <th className="px-4 py-3 font-medium">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {devs.map(dev => (
                <tr key={dev.id} className="hover:bg-gray-800/40" data-testid="developer-row">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300">
                        {dev.github_login[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-gray-200 font-medium">{dev.github_login}</p>
                        {dev.email && <p className="text-gray-500 text-xs">{dev.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-300">
                      <GitCommit size={13} className="text-gray-500" />
                      {dev.total_commits}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-0.5 text-green-400"><Plus size={11} />{dev.total_additions}</span>
                      <span className="flex items-center gap-0.5 text-red-400"><Minus size={11} />{dev.total_deletions}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-red-400 font-mono">{dev.critical_findings_count}</td>
                  <td className="px-4 py-3 text-orange-400 font-mono">{dev.high_findings_count}</td>
                  <td className="px-4 py-3 font-mono text-gray-300">{Number(dev.risk_score).toFixed(1)}</td>
                  <td className="px-4 py-3"><RiskBadge score={Number(dev.risk_score)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
