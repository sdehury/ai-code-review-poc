import { NavLink } from 'react-router-dom'
import { LayoutDashboard, GitBranch, ClipboardList, Users, Shield, TrendingUp, Code2 } from 'lucide-react'
import clsx from 'clsx'

const nav = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/repositories', label: 'Repositories', icon: GitBranch },
  { to: '/reviews',      label: 'Reviews',      icon: ClipboardList },
  { to: '/developers',   label: 'Developers',   icon: Users },
  { to: '/security',     label: 'Security',     icon: Shield },
  { to: '/techdebt',     label: 'Tech Debt',    icon: TrendingUp },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-800">
        <Code2 className="text-blue-400" size={22} />
        <span className="font-bold text-sm text-white leading-tight">
          Java Code<br />Review
        </span>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1" data-testid="sidebar-nav">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-600">
        v1.0.0 — Java Code Review
      </div>
    </aside>
  )
}
