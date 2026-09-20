import { type NextFunction, type Request, type RequestHandler, type Response } from 'express'

type AsyncRoute<Req extends Request = Request> = (
  req: Req,
  res: Response,
  next: NextFunction,
) => Promise<void>

/**
 * Wraps an async Express handler so thrown errors are forwarded to the
 * global error handler instead of crashing the route.
 */
export function asyncHandler<Req extends Request = Request>(handler: AsyncRoute<Req>): RequestHandler {
  return (req, res, next) => {
    void handler(req as Req, res, next).catch(next)
  }
}