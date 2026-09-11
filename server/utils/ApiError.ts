/**
 * Operational error that carries an HTTP status code and optional field details.
 * Thrown by services/controllers and translated to a JSON response by the
 * global error handler.
 */
export class ApiError extends Error {
  readonly statusCode: number
  readonly details?: string[]

  constructor(statusCode: number, message: string, details?: string[]) {
    super(message)
    this.statusCode = statusCode
    this.details = details
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** PostgreSQL unique-violation SQLSTATE, surfaced by PostgREST error responses. */
export const DUPLICATE_KEY_CODE = '23505'

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === DUPLICATE_KEY_CODE
  )
}