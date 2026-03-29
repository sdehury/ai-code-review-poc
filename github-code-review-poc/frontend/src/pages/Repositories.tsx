import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, GitBranch, Play, Trash2, ChevronRight, Clock } from 'lucide-react'
import { getRepositories, createRepository, deleteRepository, triggerReview } from '../services/api'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import StatusBadge from '../components/shared/StatusBadge'
import { format, parseISO } from 'date-fns'

export default function Repositories() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ full_name: '', branch: 'main', access_token: '' })
  const [error, setError] = useState('')

  const { data: repos, isLoading } = useQuery({ queryKey: ['repositories'], queryFn: getRepositories })

  const addMutation = useMutation({
    mutationFn: createRepository,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['repositories'] }); setShowAdd(false); setForm({ full_name: '', branch: 'main', access_token: '' }) },
    onError: (e: any) => setError(e.response?.data?.detail ?? 'Failed to add repository'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRepository,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['repositories'] }),
  })

  const triggerMutation = useMutation({ mutationFn: triggerReview })

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const parts = form.full_name.split('/')
    if (parts.length !== 2) { setError('Format must be owner/repo'); return }
    addMutation.mutate({
      name: parts[1], owner: parts[0], full_name: form.full_name,
      github_url: `https://github.com/${form.full_name}`,
      branch: form.branch,
      access_token: form.access_token || undefined,
    })
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6" data-testid="repositories-page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Repositories</h2>
          <p className="text-sm text-gray-400 mt-1">{repos?.length ?? 0} configured</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          data-testid="add-repo-btn">
          <Plus size={16} /> Add Repository
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4" data-testid="add-repo-form">
          <h3 className="text-sm font-semibold text-gray-200">Add GitHub Repository</h3>
          {error && <p className="text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Repository (owner/repo) *</label>
              <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="e.g. octocat/hello-world"
                value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                required data-testid="repo-name-input" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Branch</label>
              <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="main" value={form.branch}
                onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} data-testid="repo-branch-input" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">GitHub Token (optional)</label>
              <input type="password" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="ghp_..." value={form.access_token}
                onChange={e => setForm(f => ({ ...f, access_token: e.target.value }))} data-testid="repo-token-input" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={addMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              data-testid="submit-repo-btn">
              {addMutation.isPending ? 'Adding...' : 'Add Repository'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {!repos || repos.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
            <GitBranch size={36} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-300 font-medium">No repositories configured</p>
            <p className="text-gray-500 text-sm mt-1">Click "Add Repository" to get started</p>
          </div>
        ) : (
          repos.map(repo => (
            <div key={repo.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4"
              data-testid={`repo-card-${repo.full_name.replace('/', '-')}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link to={`/repositories/${repo.id}`} className="font-medium text-white hover:text-blue-400 transition-colors">
                    {repo.full_name}
                  </Link>
                  {!repo.is_active && <span className="text-xs text-gray-500">(inactive)</span>}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><GitBranch size={11} />{repo.branch}</span>
                  {repo.schedule?.last_run_at && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} />Last: {format(parseISO(repo.schedule.last_run_at), 'MMM d HH:mm')}
                    </span>
                  )}
                  {repo.schedule?.last_run_status && <StatusBadge status={repo.schedule.last_run_status} />}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => triggerMutation.mutate(repo.id)}
                  className="flex items-center gap-1 bg-green-700/40 hover:bg-green-700/60 text-green-300 text-xs px-3 py-1.5 rounded-lg transition-colors"
                  data-testid={`trigger-btn-${repo.id}`}>
                  <Play size={12} /> Review
                </button>
                <Link to={`/repositories/${repo.id}`}
                  className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                  <ChevronRight size={16} />
                </Link>
                <button onClick={() => { if (confirm(`Delete ${repo.full_name}?`)) deleteMutation.mutate(repo.id) }}
                  className="text-gray-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                  data-testid={`delete-btn-${repo.id}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
