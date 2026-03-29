import clsx from 'clsx'

const MAP: Record<string, string> = {
  CRITICAL: 'bg-red-900/50 text-red-300 border border-red-700',
  HIGH:     'bg-orange-900/50 text-orange-300 border border-orange-700',
  MEDIUM:   'bg-yellow-900/50 text-yellow-300 border border-yellow-700',
  LOW:      'bg-green-900/50 text-green-300 border border-green-700',
  INFO:     'bg-blue-900/50 text-blue-300 border border-blue-700',
}

export default function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={clsx('px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide', MAP[severity] ?? MAP.INFO)}
      data-testid={`severity-badge-${severity.toLowerCase()}`}>
      {severity}
    </span>
  )
}
