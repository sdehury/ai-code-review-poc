import { useQuery } from '@tanstack/react-query'
import { GitBranch, AlertTriangle, Users, Star, ClipboardCheck, TrendingUp } from 'lucide-react'
import { getDashboardSummary, getDashboardTrends, getReviews } from '../services/api'
import KPICard from '../components/dashboard/KPICard'
import FindingsTrendChart from '../components/dashboard/FindingsTrendChart'
import SeverityDonut from '../components/dashboard/SeverityDonut'
import StatusBadge from '../components/shared/StatusBadge'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { format, parseISO } from 'date-fns'

export default function Dashboard() {
  const { data: summary, isLoading: loadingSum } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    refetchInterval: 30_000,
  })
  const { data: trendsData, isLoading: loadingTrends } = useQuery({
    queryKey: ['dashboard-trends'],
    queryFn: () => getDashboardTrends(30),
  })
  const { data: recentReviews } = useQuery({
    queryKey: ['reviews', { limit: 8 }],
    queryFn: () => getReviews({ limit: 8 }),
  })

  if (loadingSum) return <LoadingSpinner message="Loading dashboard..." />

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div>
        <h2 className="text-xl font-bold text-white">Dashboard</h2>
        <p className="text-sm text-gray-400 mt-1">Automated Java/Spring code review overview</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Repositories"      value={summary?.total_repositories ?? 0}  icon={GitBranch}      color="blue"   testId="kpi-repos" />
        <KPICard title="Commits Reviewed"  value={summary?.total_commits_reviewed ?? 0} icon={ClipboardCheck} color="green"  testId="kpi-commits" />
        <KPICard title="Total Findings"    value={summary?.total_findings ?? 0}       icon={TrendingUp}     color="purple" testId="kpi-findings" />
        <KPICard title="Critical"          value={summary?.critical_findings ?? 0}    icon={AlertTriangle}  color="red"    testId="kpi-critical" />
        <KPICard title="Avg Score"         value={`${summary?.average_score ?? 0}/100`} icon={Star}         color="orange" testId="kpi-score" />
        <KPICard title="Developers"        value={summary?.total_developers ?? 0}     icon={Users}          color="blue"   testId="kpi-devs" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          {loadingTrends ? <LoadingSpinner /> : trendsData && <FindingsTrendChart data={trendsData.trends} />}
        </div>
        <div>
          {summary && <SeverityDonut summary={summary} />}
        </div>
      </div>

      {/* Recent reviews */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Recent Reviews</h3>
        {!recentReviews || recentReviews.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No reviews yet. Add a repository and trigger a review.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="recent-reviews-table">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Score</th>
                  <th className="pb-2 pr-4 font-medium">Summary</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {recentReviews.map(r => (
                  <tr key={r.id} className="hover:bg-gray-800/50">
                    <td className="py-2 pr-4"><StatusBadge status={r.status} /></td>
                    <td className="py-2 pr-4 font-mono text-gray-300">
                      {r.overall_score != null ? `${r.overall_score}/100` : '—'}
                    </td>
                    <td className="py-2 pr-4 text-gray-400 truncate max-w-xs">{r.summary ?? '—'}</td>
                    <td className="py-2 text-gray-500 text-xs whitespace-nowrap">
                      {format(parseISO(r.created_at), 'MMM d, HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
