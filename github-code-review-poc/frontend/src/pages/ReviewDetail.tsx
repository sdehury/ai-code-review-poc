import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReview, getReviewFindings, markFalsePositive, resolveFinding } from '../services/api'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import StatusBadge from '../components/shared/StatusBadge'
import SeverityBadge from '../components/shared/SeverityBadge'
import { format, parseISO } from 'date-fns'
import { ShieldAlert, Wrench, Code2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { Finding } from '../types'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  SECURITY:     <ShieldAlert size={14} className="text-red-400" />,
  TECH_DEBT:    <Wrench size={14} className="text-yellow-400" />,
  CODE_QUALITY: <Code2 size={14} className="text-blue-400" />,
}

function FindingCard({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false)
  const qc = useQueryClient()
  const fpMutation = useMutation({ mutationFn: markFalsePositive, onSuccess: () => qc.invalidateQueries({ queryKey: ['findings'] }) })
  const resMutation = useMutation({ mutationFn: resolveFinding, onSuccess: () => qc.invalidateQueries({ queryKey: ['findings'] }) })

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden" data-testid="finding-card">
      <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/40 text-left" onClick={() => setExpanded(!expanded)}>
        {CATEGORY_ICONS[finding.category] ?? <Code2 size={14} className="text-gray-400" />}
        <SeverityBadge severity={finding.severity} />
        <span className="flex-1 text-sm text-gray-200 truncate">{finding.title}</span>
        {finding.file_path && <span className="text-xs text-gray-500 font-mono truncate max-w-[200px]">{finding.file_path}</span>}
        {expanded ? <ChevronUp size={14} className="text-gray-500 shrink-0" /> : <ChevronDown size={14} className="text-gray-500 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-800 bg-gray-900/50 space-y-3">
          {finding.description && <p className="text-sm text-gray-300 mt-3">{finding.description}</p>}
          {finding.code_snippet && (
            <pre className="bg-gray-950 border border-gray-800 rounded p-3 text-xs text-green-300 font-mono overflow-x-auto whitespace-pre-wrap">
              {finding.code_snippet}
            </pre>
          )}
          {finding.recommendation && (
            <div className="bg-blue-900/20 border border-blue-800/40 rounded p-3">
              <p className="text-xs text-blue-300 font-medium mb-1">Recommendation</p>
              <p className="text-xs text-gray-300">{finding.recommendation}</p>
            </div>
          )}
          {finding.cwe_id && <p className="text-xs text-gray-500">CWE: <span className="text-gray-400">{finding.cwe_id}</span></p>}
          <div className="flex gap-2 pt-1">
            <button onClick={() => fpMutation.mutate(finding.id)}
              className="text-xs text-gray-400 hover:text-yellow-300 border border-gray-700 hover:border-yellow-700 px-3 py-1 rounded transition-colors">
              Mark False Positive
            </button>
            <button onClick={() => resMutation.mutate(finding.id)}
              className="text-xs text-gray-400 hover:text-green-300 border border-gray-700 hover:border-green-700 px-3 py-1 rounded transition-colors">
              Mark Resolved
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReviewDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: review, isLoading: loadingReview } = useQuery({ queryKey: ['review', id], queryFn: () => getReview(id!) })
  const { data: findings, isLoading: loadingFindings } = useQuery({ queryKey: ['findings', id], queryFn: () => getReviewFindings(id!), enabled: !!id })

  if (loadingReview || loadingFindings) return <LoadingSpinner />
  if (!review) return <div className="text-gray-400">Review not found</div>

  const grouped = (findings ?? []).reduce((acc, f) => {
    acc[f.category] = acc[f.category] ?? []
    acc[f.category].push(f)
    return acc
  }, {} as Record<string, Finding[]>)

  const scoreColor = (s: number) => s >= 70 ? 'text-green-400' : s >= 40 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="space-y-6" data-testid="review-detail-page">
      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <StatusBadge status={review.status} />
            {review.overall_score != null && (
              <span className={`text-2xl font-bold ${scoreColor(review.overall_score)}`}>
                {review.overall_score}/100
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500">{format(parseISO(review.created_at), 'MMM d yyyy, HH:mm')}</span>
        </div>
        {review.summary && (
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-xs text-blue-400 font-medium mb-1">AI Review Summary</p>
            <p className="text-sm text-gray-300">{review.summary}</p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-4 mt-3 text-center">
          {[
            { label: 'Security Score', val: review.security_score },
            { label: 'Quality Score',  val: review.quality_score },
            { label: 'Tech Debt Score',val: review.techdebt_score },
          ].map(({ label, val }) => (
            <div key={label} className="bg-gray-800/40 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-lg font-bold ${val != null ? scoreColor(val) : 'text-gray-600'}`}>
                {val != null ? `${val}/100` : '—'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Findings grouped by category */}
      {findings?.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <p className="text-green-400 font-medium">No issues found — clean review!</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-2" data-testid={`findings-group-${category.toLowerCase()}`}>
            <div className="flex items-center gap-2 mb-3">
              {CATEGORY_ICONS[category]}
              <h3 className="text-sm font-semibold text-gray-200">{category.replace('_', ' ')} <span className="text-gray-500">({items.length})</span></h3>
            </div>
            {items.map(f => <FindingCard key={f.id} finding={f} />)}
          </div>
        ))
      )}
    </div>
  )
}
