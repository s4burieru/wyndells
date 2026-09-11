import { type NextFunction, type Request, type Response } from 'express'
import { DUPLICATE_KEY_CODE, isApiError } from '../utils/ApiError'

type PostgrestErrorLike = { code?: unknown; message?: unknown; details?: unknown }

/**
 * Maps PostgreSQL SQLSTATE codes surfaced by PostgREST to friendly API errors.
 * Returns null when the error is not a recognised database constraint issue.
 */
function postgrestErrorStatus(error: PostgrestErrorLike): { status: number; message: string } | null {
  if (typeof error.code !== 'string') {
    return null
  }
  switch (error.code) {
    case DUPLICATE_KEY_CODE: // unique_violation
      return { status: 409, message: 'A record with this value already exists.' }
    case '23503': // foreign_key_violation
      return { status: 400, message: 'The referenced record does not exist.' }
    case '23514': // check_violation
      return { status: 400, message: 'Some of the information provided is invalid.' }
    case '22P02': // invalid_text_representation (e.g. a malformed uuid)
      return { status: 400, message: 'The requested resource id is not valid.' }
    default:
      return null
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: 'Resource not found' })
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error)
    return
  }

  if (isApiError(error)) {
    res.status(error.statusCode).json({
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    })
    return
  }

  const dbError = postgrestErrorStatus(error as PostgrestErrorLike)
  if (dbError) {
    res.status(dbError.status).json({ message: dbError.message })
    return
  }

  console.error('Unhandled error:', error)
  res.status(500).json({ message: 'Something went wrong on our end. Please try again later.' })
}