import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { KPISummary } from '../../types'

const COLORS = ['#dc2626', '#ea580c', '#d97706', '#16a34a']

export default function SeverityDonut({ summary }: { summary: KPISummary }) {
  const data = [
    { name: 'Critical', value: summary.critical_findings },
    { name: 'High',     value: summary.high_findings },
    { name: 'Medium',   value: summary.medium_findings },
    { name: 'Low',      value: summary.low_findings },
  ].filter(d => d.value > 0)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5" data-testid="severity-donut">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Severity Breakdown</h3>
      {data.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-gray-500 text-sm">No findings yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
