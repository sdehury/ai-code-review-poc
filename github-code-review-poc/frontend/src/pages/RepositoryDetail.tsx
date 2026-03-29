import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, GitCommit } from 'lucide-react'
import { getRepository, getRepositoryCommits, triggerReview, upsertSchedule } from '../services/api'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import StatusBadge from '../components/shared/StatusBadge'
import { format, parseISO } from 'date-fns'
import { useState } from 'react'

export default function RepositoryDetail() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: repo, isLoading } = useQuery({ queryKey: ['repository', id], queryFn: () => getRepository(id!) })
  const { data: commits } = useQuery({ queryKey: ['commits', id], queryFn: () => getRepositoryCommits(id!) })

  const [cron, setCron] = useState('')
  const triggerMutation = useMutation({ mutationFn: triggerReview, onSuccess: () => qc.invalidateQueries({ queryKey: ['repository', id] }) })
  const scheduleMutation = useMutation({
    mutationFn: (expr: string) => upsertSchedule(id!, { cron_expression: expr }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['repository', id] }),
  })

  if (isLoading) return <LoadingSpinner />
  if (!repo) return <div className="text-gray-400">Repository not found</div>

  return (
    <div className="space-y-6" data-testid="repository-detail-page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{repo.full_name}</h2>
          <p className="text-sm text-gray-400">Branch: <span className="text-gray-300">{repo.branch}</span></p>
        </div>
        <button onClick={() => triggerMutation.mutate(repo.id)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
          data-testid="trigger-review-btn">
          <Play size={14} /> Trigger Review
        </button>
      </div>

      {/* Schedule config */}
      {repo.schedule && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-200 mb-3">Schedule Configuration</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div><p className="text-gray-500 text-xs">Cron</p><p className="text-gray-200 font-mono">{repo.schedule.cron_expression}</p></div>
            <div><p className="text-gray-500 text-xs">Branch Pattern</p><p className="text-gray-200">{repo.schedule.branch_pattern}</p></div>
            <div><p className="text-gray-500 text-xs">Lookback Days</p><p className="text-gray-200">{repo.schedule.lookback_days}</p></div>
            <div><p className="text-gray-500 text-xs">Last Run</p>
              <p className="text-gray-200">{repo.schedule.last_run_at ? format(parseISO(repo.schedule.last_run_at), 'MMM d HH:mm') : '—'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white font-mono w-48 focus:outline-none focus:border-blue-500"
              placeholder="0 */6 * * *" value={cron} onChange={e => setCron(e.target.value)} />
            <button onClick={() => scheduleMutation.mutate(cron || repo.schedule!.cron_expression)}
              className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded transition-colors">
              Update Schedule
            </button>
          </div>
        </div>
      )}

      {/* Commits */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Recent Commits ({commits?.length ?? 0})</h3>
        {!commits || commits.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">No commits found. Trigger a review to fetch commits.</p>
        ) : (
          <div className="space-y-2">
            {commits.map(c => (
              <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0"
                data-testid="commit-row">
                <GitCommit size={14} className="text-gray-500 shrink-0" />
                <code className="text-xs text-blue-400 font-mono w-16 shrink-0">{c.sha.slice(0, 7)}</code>
                <p className="flex-1 text-sm text-gray-300 truncate">{c.message?.split('\n')[0]}</p>
                <span className="text-xs text-gray-500 shrink-0">{c.author_name}</span>
                <StatusBadge status={c.review_status} />
                <span className="text-xs text-gray-600 shrink-0">{format(parseISO(c.committed_at), 'MMM d')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
