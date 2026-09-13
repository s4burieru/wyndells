import { StarIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '../ui/card'

export function StatCard({
  label,
  value,
  icon,
  accent = 'text-foreground',
}: {
  label: string
  value: string | number
  icon?: ReactNode
  accent?: string
}) {
  return (
    <Card className="gap-0 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon ? <span className="text-lg" aria-hidden>{icon}</span> : null}
      </div>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    </Card>
  )
}

export function RatingStat({ label, value, count }: { label: string; value: number; count?: number }) {
  return (
    <Card className="gap-0 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold text-wyndell-forest">
        {value}
        <StarIcon className="size-5 fill-wyndell-sun text-wyndell-sun" aria-hidden />
      </p>
      {count !== undefined ? <p className="mt-0.5 text-xs text-muted-foreground">{count} submissions</p> : null}
    </Card>
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
      <div className="mt-0.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}