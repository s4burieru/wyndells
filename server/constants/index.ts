export const USER_ROLES = ['admin', 'manager'] as const
export type UserRole = (typeof USER_ROLES)[number]

/** Staff profile limits (the profile columns added to the `users` table). */
export const MAX_NAME_LENGTH = 120
export const MAX_POSITION_LENGTH = 80
export const MAX_PROFILE_TEXT_LENGTH = 160
export const MAX_AVATAR_URL_LENGTH = 500
export const MAX_BIO_LENGTH = 500

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

export const CAREER_DEPARTMENTS = ['restaurant', 'cafe'] as const
export type CareerDepartment = (typeof CAREER_DEPARTMENTS)[number]

export const POSTING_STATUSES = ['open', 'closed'] as const
export type PostingStatus = (typeof POSTING_STATUSES)[number]

export const APPLICATION_STATUSES = ['new', 'reviewed', 'shortlisted', 'hired', 'rejected'] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

/**
 * Valid one-step transitions for the application pipeline.
 * New -> Reviewed / Rejected
 * Reviewed -> Shortlisted / Rejected
 * Shortlisted -> Hired / Rejected
 * Hired / Rejected are terminal.
 */
export const APPLICATION_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  new: ['reviewed', 'rejected'],
  reviewed: ['shortlisted', 'rejected'],
  shortlisted: ['hired', 'rejected'],
  hired: [],
  rejected: [],
}

export const MAX_APPLICATIONS_PER_CLIENT_PER_HOUR = 5
export const MAX_COVER_LETTER_LENGTH = 3000