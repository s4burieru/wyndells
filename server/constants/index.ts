export const USER_ROLES = ['admin', 'manager'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const RESERVATION_STATUSES = [
  'pending',
  'confirmed',
  'rejected',
  'cancelled',
  'completed',
  'no-show',
] as const
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number]

/**
 * Valid one-step transitions for the reservation workflow.
 * Pending -> Confirmed / Rejected / Cancelled
 * Confirmed -> Completed / Cancelled / No-show
 * Terminal statuses cannot transition anywhere.
 */
export const RESERVATION_TRANSITIONS: Record<ReservationStatus, readonly ReservationStatus[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no-show'],
  rejected: [],
  cancelled: [],
  completed: [],
  'no-show': [],
}

/** Reservations that still occupy / hold a table slot. */
export const ACTIVE_RESERVATION_STATUSES: readonly ReservationStatus[] = ['pending', 'confirmed']

export const TABLE_STATUSES = ['available', 'reserved', 'occupied', 'cleaning', 'unavailable'] as const
export type TableStatus = (typeof TABLE_STATUSES)[number]

/** Table statuss that should never be offered for a new booking. */
export const UNBOOKABLE_TABLE_STATUSES: readonly TableStatus[] = ['cleaning', 'unavailable']

export const MENU_CATEGORIES = [
  'Appetizers',
  'Main Courses',
  'Rice Meals',
  'Drinks',
  'Desserts',
  'Others',
] as const
export type MenuCategory = (typeof MENU_CATEGORIES)[number]

export const MAX_GUESTS_PER_RESERVATION = 50
export const MAX_RESERVATIONS_PER_CONTACT_PER_DAY = 3
export const FEEDBACK_MAX_SUBMISSIONS_PER_CLIENT_PER_HOUR = 3