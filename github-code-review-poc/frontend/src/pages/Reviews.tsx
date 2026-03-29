import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getReviews } from '../services/api'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import StatusBadge from '../components/shared/StatusBadge'
import { format, parseISO } from 'date-fns'
import { ClipboardList } from 'lucide-react'

export default function Reviews() {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => getReviews({ limit: 100 }),
    refetchInterval: 15_000,
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6" data-testid="reviews-page">
      <div>
        <h2 className="text-xl font-bold text-white">Reviews</h2>
        <p className="text-sm text-gray-400 mt-1">{reviews?.length ?? 0} total</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {!reviews || reviews.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardList size={36} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-300">No reviews yet</p>
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="reviews-table">
            <thead className="bg-gray-800/50">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Summary</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {reviews.map(r => (
                <tr key={r.id} className="hover:bg-gray-800/40" data-testid="review-row">
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 font-mono text-gray-300">
                    {r.overall_score != null ? (
                      <span className={r.overall_score >= 70 ? 'text-green-400' : r.overall_score >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                        {r.overall_score}/100
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{r.summary ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {format(parseISO(r.created_at), 'MMM d, HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/reviews/${r.id}`} className="text-blue-400 hover:text-blue-300 text-xs">View →</Link>
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
