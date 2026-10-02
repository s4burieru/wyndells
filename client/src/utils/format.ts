import type {
  ApplicationStatus,
  CareerDepartment,
  MenuCategory,
  ReservationStatus,
  Role,
  TableStatus,
} from '@/types'

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
  return dateToString(new Date())
}

/**
 * Parses a `YYYY-MM-DD` value as *local* midnight. Using the local calendar
 * (instead of `new Date('2026-09-28')`, which is parsed as UTC) keeps the
 * picker on the same day the user picked, regardless of timezone.
 * Returns `undefined` for empty or malformed values.
 */
export function dateStringToDate(value: string): Date | undefined {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) {
    return undefined
  }
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** Converts a `Date` to the `YYYY-MM-DD` string the app and API use. */
export function dateToString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Short relative timestamp used by the notification list ("5m ago", "2h ago",
 * "yesterday"). Anything older than a week falls back to a date so the list
 * never shows an unhelpfully vague "347d ago".
 */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const seconds = Math.max(Math.floor((Date.now() - then) / 1000), 0)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return formatDate(new Date(then).toISOString().slice(0, 10))
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
  pending: 'bg-wyndell-sun/25 text-yellow-900',
  confirmed: 'bg-wyndell-green/15 text-wyndell-green-dark',
  rejected: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-wyndell-taupe/25 text-wyndell-ink',
  completed: 'bg-sky-500/15 text-sky-800',
  'no-show': 'bg-purple-500/15 text-purple-800',
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
  available: 'bg-wyndell-green-dark',
  reserved: 'bg-wyndell-sun',
  occupied: 'bg-wyndell-orange',
  cleaning: 'bg-sky-500',
  unavailable: 'bg-wyndell-taupe',
}

/** Solid dot colour for a table status (also used by the status charts). */
export function tableDotClass(status: TableStatus): string {
  return TABLE_DOT[status] ?? 'bg-wyndell-taupe'
}

const TABLE_BADGE_STYLES: Record<TableStatus, string> = {
  available: 'bg-wyndell-green/15 text-wyndell-green-dark',
  reserved: 'bg-wyndell-sun/25 text-yellow-900',
  occupied: 'bg-wyndell-orange/15 text-wyndell-orange-dark',
  cleaning: 'bg-sky-500/15 text-sky-800',
  unavailable: 'bg-wyndell-taupe/25 text-wyndell-ink',
}

/** Tinted badge surface + AA-passing label colour for a table status. */
export function tableBadgeClass(status: TableStatus): string {
  return TABLE_BADGE_STYLES[status] ?? 'bg-wyndell-taupe/25 text-wyndell-ink'
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

const DEPARTMENT_LABELS: Record<CareerDepartment, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
}

export function departmentLabel(department: CareerDepartment): string {
  return DEPARTMENT_LABELS[department] ?? department
}

const APPLICATION_LABELS: Record<ApplicationStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  shortlisted: 'Shortlisted',
  hired: 'Hired',
  rejected: 'Rejected',
}

export function applicationLabel(status: ApplicationStatus): string {
  return APPLICATION_LABELS[status] ?? status
}

const APPLICATION_STYLES: Record<ApplicationStatus, string> = {
  new: 'bg-wyndell-sun/25 text-yellow-900',
  reviewed: 'bg-wyndell-taupe/25 text-wyndell-ink',
  shortlisted: 'bg-wyndell-orange/15 text-wyndell-orange-dark',
  hired: 'bg-wyndell-green/15 text-wyndell-green-dark',
  rejected: 'bg-destructive/10 text-destructive',
}

export function applicationBadgeClass(status: ApplicationStatus): string {
  return APPLICATION_STYLES[status] ?? 'bg-wyndell-taupe/25 text-wyndell-ink'
}

const APPLICATION_NEXT: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  new: ['reviewed', 'rejected'],
  reviewed: ['shortlisted', 'rejected'],
  shortlisted: ['hired', 'rejected'],
  hired: [],
  rejected: [],
}

/** Statuses an application can move to next (mirrors the server pipeline). */
export function applicationNextStatuses(status: ApplicationStatus): readonly ApplicationStatus[] {
  return APPLICATION_NEXT[status] ?? []
}

const POSTING_LABELS: Record<'open' | 'closed', string> = {
  open: 'Open',
  closed: 'Closed',
}

export function postingLabel(status: 'open' | 'closed'): string {
  return POSTING_LABELS[status] ?? status
}

/** A short, human-friendly description of an error. */
export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return fallback
}

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  hr: 'HR',
}

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? role
}

const ROLE_BADGE_STYLES: Record<Role, string> = {
  admin: 'bg-wyndell-orange/15 text-wyndell-orange-dark',
  manager: 'bg-wyndell-green/15 text-wyndell-green-dark',
  hr: 'bg-wyndell-sun/25 text-wyndell-bark',
}

export function roleBadgeClass(role: Role): string {
  return ROLE_BADGE_STYLES[role] ?? 'bg-wyndell-taupe/25 text-wyndell-ink'
}

const ROLE_AVATAR_STYLES: Record<Role, string> = {
  admin: 'bg-wyndell-orange/20 text-wyndell-orange-dark',
  manager: 'bg-wyndell-green/15 text-wyndell-green-dark',
  hr: 'bg-wyndell-sun/25 text-wyndell-bark',
}

/** Avatar fallback colours, matching the role badge palette. */
export function roleAvatarClass(role: Role): string {
  return ROLE_AVATAR_STYLES[role] ?? 'bg-muted text-muted-foreground'
}
