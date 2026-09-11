import { ApiError } from './ApiError'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^\+?[\d\s()-]{7,20}$/
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

/** PostgreSQL `uuid` key format (v4-style with a valid variant/version nibble). */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** True when the value looks like a Postgres uuid key. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

export function assertUuid(value: string, label = 'id'): string {
  if (!isUuid(value)) {
    throw new ApiError(400, `Invalid ${label}`)
  }
  return value
}

/** Throws a 400 if any required field is missing or an empty string. */
export function requireFields(
  body: Record<string, unknown>,
  required: readonly string[],
): void {
  for (const field of required) {
    const value = body[field]
    if (value === undefined || value === null || value === '') {
      throw new ApiError(400, `The field "${field}" is required`)
    }
  }
}

export function assertEmail(value: string, label = 'email'): void {
  if (!EMAIL_PATTERN.test(value)) {
    throw new ApiError(400, `Please provide a valid ${label}`)
  }
}

export function assertPhone(value: string, label = 'contact number'): void {
  if (!PHONE_PATTERN.test(value)) {
    throw new ApiError(400, `Please provide a valid ${label}`)
  }
}

const MIN_DATE = new Date('2000-01-01T00:00:00Z')
const MAX_DATE = new Date('2200-12-31T00:00:00Z')

/** Validates a YYYY-MM-DD string and returns it when valid. */
export function assertDateString(value: string, label = 'date'): string {
  if (!DATE_PATTERN.test(value)) {
    throw new ApiError(400, `Please provide a valid ${label} in YYYY-MM-DD format`)
  }
  return value
}

/** True when the given YYYY-MM-DD string is a real calendar date. */
export function isRealDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed >= MIN_DATE && parsed <= MAX_DATE
}

export function assertTimeString(value: string, label = 'time'): void {
  if (!TIME_PATTERN.test(value)) {
    throw new ApiError(400, `Please provide a valid ${label} in 24-hour format (HH:MM)`)
  }
}

/** Returns today's date as a YYYY-MM-DD string in the server's local timezone. */
export function todayString(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Adds whole days to a YYYY-MM-DD string and returns a new YYYY-MM-DD string. */
export function addDays(dateString: string, days: number): string {
  const parsed = new Date(`${dateString}T00:00:00Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}

export function normalizeReference(value: string): string {
  return value.trim().toUpperCase()
}

/**
 * Reduces a contact number to its comparable form. Formatting characters are
 * stripped, and numbers longer than 10 digits (e.g. +63 917 …) are reduced to
 * the last 10 so `0917-123-4567`, `0917 123 4567`, and `+639171234567` all
 * match the same stored reservation.
 */
export function normalizePhone(value: string): string {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}