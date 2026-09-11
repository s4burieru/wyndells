import type { ReactNode } from 'react'

export function StatCard({
  label,
  value,
  icon,
  accent = 'text-wyndell-ink',
}: {
  label: string
  value: string | number
  icon?: ReactNode
  accent?: string
}) {
  return (
    <div className="rounded-2xl border border-wyndell-cream-dark bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-neutral-500">{label}</p>
        {icon ? <span className="text-lg" aria-hidden>{icon}</span> : null}
      </div>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}

export function RatingStat({ label, value, count }: { label: string; value: number; count?: number }) {
  return (
    <div className="rounded-2xl border border-wyndell-cream-dark bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold text-wyndell-forest">
        {value}
        <StarIcon className="h-5 w-5" />
      </p>
      {count !== undefined ? <p className="mt-0.5 text-xs text-neutral-500">{count} submissions</p> : null}
    </div>
  )
}

export function StarIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="#f9c515" className={className} aria-hidden>
      <path
        strokeWidth="1.6"
        d="M9.94 16.056l-5.97 4.527a.75.75 0 0 0-1.84-1.326 0 0 0-2.68-3.186c.124-.084.384-.432.55-.98 0 0-.821.41-.41.821-.82 0-1.643 0 0 .21-.131.5-.383.82 0 0-.5-.383-.21-.131-1.644-.41-.41-1.643-.82.82 0 0-0.821.41-.41.821-.82 0 0-2.68-3.184 0 0 -.384-.432-.55-.98V8.388c-.067.146-.812 1.25-1.254 1.513l1.448 1.093 1.882.91"
      />
    </svg>
  )
}

export function TrendChart({ points, height = 120 }: { points: { date: string; total: number }[]; height?: number }) {
  const max = Math.max(...points.map((point) => point.total), 1)
  const width = 900
  const padding = 12
  const step = (width - padding * 2) / Math.max(points.length - 1, 1)
  const coordinates = points.map((point, index) => ({
    x: padding + index * step,
    y: height - (point.total / max) * (height - 24) - 12,
  }))

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full" preserveAspectRatio="none" role="img" aria-label="Reservations trend">
        <g>
          {coordinates.map((point) => (
            <circle key={point.x} cx={point.x} cy={point.y} r="3.5" fill="#f0810d" />
          ))}
        </g>
        <polyline points={coordinates.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#f0810d" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div className="mt-1 flex items-center gap-1 text-[10px] text-neutral-400">
        <span>{points[0]?.date ?? ''}</span>
        <span className="ml-auto">{points.at(-1)?.date ?? ''}</span>
      </div>
    </div>
  )
}

/** Simple horizontal bar used in reports to compare categories. */
export function HBar({ label, value, max, color = 'bg-wyndell-orange' }: { label: string; value: number; max: number; color?: string }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-medium text-wyndell-ink">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-0.5 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}