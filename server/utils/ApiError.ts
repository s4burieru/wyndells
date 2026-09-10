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

/** MongoDB duplicate-key error code. */
export const DUPLICATE_KEY_CODE = 11000

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === DUPLICATE_KEY_CODE
  )
}