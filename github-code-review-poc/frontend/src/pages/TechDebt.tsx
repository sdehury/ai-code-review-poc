import { useQuery } from '@tanstack/react-query'
import { getFindings } from '../services/api'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import SeverityBadge from '../components/shared/SeverityBadge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export default function TechDebt() {
  const { data: findings, isLoading } = useQuery({
    queryKey: ['findings', 'TECH_DEBT'],
    queryFn: () => getFindings({ category: 'TECH_DEBT', limit: 200 }),
  })

  if (isLoading) return <LoadingSpinner />

  const active = findings?.filter(f => !f.resolved_at && !f.is_false_positive) ?? []

  // Group by rule
  const byRule = active.reduce((acc, f) => {
    const key = f.rule_id ?? f.title
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const chartData = Object.entries(byRule)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name: name.replace('TD00', 'TD-').slice(0, 20), count }))

  return (
    <div className="space-y-6" data-testid="techdebt-page">
      <div>
        <h2 className="text-xl font-bold text-white">Technical Debt</h2>
        <p className="text-sm text-gray-400 mt-1">{active.length} active debt items</p>
      </div>

      {chartData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Tech Debt by Rule</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} />
              <Bar dataKey="count" fill="#d97706" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {active.length === 0 ? (
          <div className="p-10 text-center">
            <TrendingUp size={36} className="text-green-500 mx-auto mb-3" />
            <p className="text-green-400 font-medium">No active tech debt</p>
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="techdebt-table">
            <thead className="bg-gray-800/50">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Rule</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {active.map(f => (
                <tr key={f.id} className="hover:bg-gray-800/40" data-testid="techdebt-row">
                  <td className="px-4 py-3"><SeverityBadge severity={f.severity} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{f.rule_id ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-200 max-w-xs truncate">{f.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[200px] truncate">{f.file_path ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{format(parseISO(f.created_at), 'MMM d')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
