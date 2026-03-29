import { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  description?: string
}

export default function EmptyState({ icon: Icon, title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center" data-testid="empty-state">
      <Icon size={40} className="text-gray-600" />
      <p className="text-gray-300 font-medium">{title}</p>
      {description && <p className="text-gray-500 text-sm max-w-sm">{description}</p>}
    </div>
  )
}
