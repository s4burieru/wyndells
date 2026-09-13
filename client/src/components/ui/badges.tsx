import { StarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { reservationBadgeClass, reservationLabel, tableDotClass, tableLabel } from '../../lib/format'
import type {  ReservationStatus, TableStatus  } from '../../lib/types'
import { Badge } from './display'

const STAR_SIZES = { sm: 'size-3.5', md: 'size-5', lg: 'size-7' } as const

export function StarRating({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          className={cn(
            STAR_SIZES[size],
            star <= Math.round(value) ? 'fill-wyndell-sun text-wyndell-sun' : 'text-muted-foreground/40'
          )}
        />
      ))}
    </span>
  )
}

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return <Badge className={reservationBadgeClass(status)}>{reservationLabel(status)}</Badge>
}

export function TableStatusBadge({ status }: { status: TableStatus }) {
  return (
    <Badge className={tableDotClass(status)}>
      <span className="h-1.5 w-1.5 rounded-full" />
      {tableLabel(status)}
    </Badge>
  )
}
