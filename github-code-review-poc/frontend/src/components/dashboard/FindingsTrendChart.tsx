import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { TrendPoint } from '../../types'
import { format, parseISO } from 'date-fns'

export default function FindingsTrendChart({ data }: { data: TrendPoint[] }) {
  const formatted = data.map(d => ({ ...d, label: format(parseISO(d.date), 'MMM d') }))
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5" data-testid="findings-trend-chart">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Findings Trend (30 days)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#e5e7eb' }} itemStyle={{ color: '#d1d5db' }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="critical" stroke="#dc2626" strokeWidth={2} dot={false} name="Critical" />
          <Line type="monotone" dataKey="high"     stroke="#ea580c" strokeWidth={2} dot={false} name="High" />
          <Line type="monotone" dataKey="medium"   stroke="#d97706" strokeWidth={2} dot={false} name="Medium" />
          <Line type="monotone" dataKey="low"      stroke="#16a34a" strokeWidth={2} dot={false} name="Low" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
