import clsx from 'clsx'

const MAP: Record<string, string> = {
  COMPLETED:   'bg-green-900/40 text-green-300',
  RUNNING:     'bg-blue-900/40 text-blue-300 animate-pulse',
  IN_PROGRESS: 'bg-blue-900/40 text-blue-300 animate-pulse',
  PENDING:     'bg-gray-700 text-gray-300',
  FAILED:      'bg-red-900/40 text-red-300',
  SKIPPED:     'bg-gray-700 text-gray-400',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', MAP[status] ?? MAP.PENDING)}
      data-testid="status-badge">
      {status}
    </span>
  )
}
