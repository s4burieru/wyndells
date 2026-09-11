import type {  MenuCategory, ReservationStatus, TableStatus  } from './types'

export function formatPrice(value: number): string {
  return `₱ ${value.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-')
  if (!year || !month || !day) {
    return dateString
  }
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return `${months[Number(month) - 1]} ${Number(day)}, ${year}`
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatTime12(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  if (hours === undefined || minutes === undefined) {
    return time
  }
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 === 0 ? 12 : hours % 12
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`
}

export function todayLocal(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function addDays(dateString: string, days: number): string {
  const parsed = new Date(`${dateString}T00:00:00`)
  parsed.setDate(parsed.getDate() + days)
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${parsed.getFullYear()}-${month}-${day}`
}

const RESERVATION_LABELS: Record<ReservationStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
  'no-show': 'No-show',
}

export function reservationLabel(status: ReservationStatus): string {
  return RESERVATION_LABELS[status] ?? status
}

const RESERVATION_STYLES: Record<ReservationStatus, string> = {
  pending: 'bg-wyndell-sun/20 text-yellow-800',
  confirmed: 'bg-wyndell-green/15 text-wyndell-green-dark',
  rejected: 'bg-red-50 text-red-800',
  cancelled: 'bg-neutral-200 text-neutral-600',
  completed: 'bg-wyndell-green-dark/15 text-wyndell-green-dark',
  'no-show': 'bg-red-50 text-red-700',
}

export function reservationBadgeClass(status: ReservationStatus): string {
  return RESERVATION_STYLES[status] ?? 'bg-neutral-100 text-neutral-700'
}

const TABLE_LABELS: Record<TableStatus, string> = {
  available: 'Available',
  reserved: 'Reserved',
  occupied: 'Occupied',
  cleaning: 'Cleaning',
  unavailable: 'Unavailable',
}

export function tableLabel(status: TableStatus): string {
  return TABLE_LABELS[status] ?? status
}

const TABLE_DOT: Record<TableStatus, string> = {
  available: 'bg-wyndell-green',
  reserved: 'bg-wyndell-orange',
  occupied: 'bg-wyndell-orange-dark',
  cleaning: 'bg-sky-400',
  unavailable: 'bg-neutral-400',
}

export function tableDotClass(status: TableStatus): string {
  return TABLE_DOT[status] ?? 'bg-neutral-400'
}

const CATEGORIES: MenuCategory[] = [
  'Appetizers',
  'Main Courses',
  'Rice Meals',
  'Drinks',
  'Desserts',
  'Others',
]

export const MENU_CATEGORIES = CATEGORIES

/** A short, human-friendly description of an error. */
export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return fallback
}