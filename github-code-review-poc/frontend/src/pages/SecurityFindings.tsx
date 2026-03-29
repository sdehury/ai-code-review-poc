import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFindings, markFalsePositive, resolveFinding } from '../services/api'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import SeverityBadge from '../components/shared/SeverityBadge'
import { ShieldAlert } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export default function SecurityFindings() {
  const qc = useQueryClient()
  const { data: findings, isLoading } = useQuery({
    queryKey: ['findings', 'SECURITY'],
    queryFn: () => getFindings({ category: 'SECURITY', limit: 200 }),
  })

  const fpMutation = useMutation({ mutationFn: markFalsePositive, onSuccess: () => qc.invalidateQueries({ queryKey: ['findings'] }) })
  const resMutation = useMutation({ mutationFn: resolveFinding, onSuccess: () => qc.invalidateQueries({ queryKey: ['findings'] }) })

  if (isLoading) return <LoadingSpinner />

  const unresolved = findings?.filter(f => !f.resolved_at && !f.is_false_positive) ?? []

  return (
    <div className="space-y-6" data-testid="security-findings-page">
      <div>
        <h2 className="text-xl font-bold text-white">Security Findings</h2>
        <p className="text-sm text-gray-400 mt-1">{unresolved.length} active security issues</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(sev => {
          const count = unresolved.filter(f => f.severity === sev).length
          return (
            <div key={sev} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <SeverityBadge severity={sev} />
              <p className="text-2xl font-bold text-white mt-2">{count}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {unresolved.length === 0 ? (
          <div className="p-10 text-center">
            <ShieldAlert size={36} className="text-green-500 mx-auto mb-3" />
            <p className="text-green-400 font-medium">No active security findings</p>
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="security-findings-table">
            <thead className="bg-gray-800/50">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Rule</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">CWE</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {unresolved.map(f => (
                <tr key={f.id} className="hover:bg-gray-800/40" data-testid="security-finding-row">
                  <td className="px-4 py-3"><SeverityBadge severity={f.severity} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{f.rule_id ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-200 max-w-xs truncate">{f.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[160px] truncate">{f.file_path ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-orange-400">{f.cwe_id ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{format(parseISO(f.created_at), 'MMM d')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => fpMutation.mutate(f.id)}
                        className="text-xs text-gray-500 hover:text-yellow-300 px-2 py-1 rounded border border-gray-700 hover:border-yellow-700 transition-colors">FP</button>
                      <button onClick={() => resMutation.mutate(f.id)}
                        className="text-xs text-gray-500 hover:text-green-300 px-2 py-1 rounded border border-gray-700 hover:border-green-700 transition-colors">Fix</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
