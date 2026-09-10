import { reservationBadgeClass, reservationLabel, tableDotClass, tableLabel } from '../../lib/format'
import type {  ReservationStatus, TableStatus  } from '../../lib/types'
import { Badge } from './display'

export function StarRating({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const classes = { sm: 'h-3.5 w-3.5', md: 'h-5 w-5', lg: 'h-7 w-7' }
  const starClass = classes[size]
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon key={star} filled={star <= Math.round(value)} className={starClass} />
      ))}
    </span>
  )
}

function StarIcon({ filled, className }: { filled: boolean; className: string }) {
  return (
    <svg viewBox="0 0 20 20" fill={filled ? '#f9c515' : 'none'} stroke={filled ? '#f9c515' : '#d6d3d1'} className={className}>
      <path
        strokeWidth="1.6"
        d="M9.94 16.056l-5.97 4.527a.75.75 0 0 0-1.84-1.326 0 0 0-2.68-3.186c.124-.084.384-.432.55-.98 0 0-.821.41-.41.821-.82 0-1.643 0 0 .21-.131.5-.383.82 0 0-.5-.383-.21-.131-1.644-.41-.41-1.643-.82.82 0 0-0.821.41-.41.821-.82 0 0-2.68-3.184 0 0 -.384-.432-.55-.98V8.388c-.067.146-.812 1.25-1.254 1.513l1.448 1.093 1.882.91"
      />
    </svg>
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