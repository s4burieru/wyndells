import { type NextFunction, type Request, type Response } from 'express'
import mongoose from 'mongoose'
import { isApiError } from '../utils/ApiError'

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

  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors).map((item) => item.message)
    res.status(400).json({ message: 'Some of the information provided is invalid.', details })
    return
  }

  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({ message: 'The requested resource id is not valid.' })
    return
  }

  console.error('Unhandled error:', error)
  res.status(500).json({ message: 'Something went wrong on our end. Please try again later.' })
}