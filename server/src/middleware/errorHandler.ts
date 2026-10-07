import { type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
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

  // Multer multipart upload errors (careers resumes, staff profile photos,
  // group chat photos, promotion card images and menu dish photos).
  if (error instanceof multer.MulterError) {
    const isPromotionImage = error.field === 'promotionImage'
    const isMenuImage = error.field === 'menuImage'
    const isPhoto = error.field === 'avatar' || error.field === 'image' || isPromotionImage || isMenuImage
    const photoNoun = isMenuImage
      ? 'menu image'
      : isPromotionImage
        ? 'promotion image'
        : error.field === 'image'
          ? 'group photo'
          : 'profile photo'
    const photoLimitMb = isPromotionImage || isMenuImage ? 4 : 2
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        message: isPhoto
          ? `The ${photoNoun} is too large. Please upload a JPG, PNG, or WEBP image up to ${photoLimitMb} MB.`
          : 'The resume file is too large. Please upload a PDF, DOC, or DOCX up to 5 MB.',
      })
      return
    }
    res.status(400).json({
      message: isPhoto
        ? 'Could not process the uploaded photo. Please try again.'
        : 'Could not process the uploaded resume. Please try again.',
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