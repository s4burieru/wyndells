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
