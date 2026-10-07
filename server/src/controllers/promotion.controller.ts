import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import {
  createPromotion,
  deletePromotion,
  listManageablePromotions,
  listPublicPromotions,
  updatePromotion,
} from '../services/promotion.service'
import type { PromotionImageUpload } from '../services/promotionImage.service'
import type { AuthedRequest } from '../middleware/auth'

export const listPublicPromotionsController = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined
  const promotions = await listPublicPromotions(Number.isFinite(limit) ? limit : undefined)
  res.json({ promotions })
})

export const listManageablePromotionsController = asyncHandler(
  async (req: AuthedRequest, res: Response) => {
    const branch = req.query.branch ? String(req.query.branch) : undefined
    const promotions = await listManageablePromotions(req.user, branch)
    res.json({ promotions })
  },
)

export const createPromotionController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  // `file` is the multer-parsed `promotionImage` when the form was sent as
  // multipart; JSON payloads simply have no file attached.
  const file = (req as AuthedRequest & { file?: PromotionImageUpload }).file
  const promotion = await createPromotion(req.body as Record<string, unknown>, file, req.user)
  res.status(201).json({ promotion })
})

export const updatePromotionController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const file = (req as AuthedRequest & { file?: PromotionImageUpload }).file
  const promotion = await updatePromotion(
    String(req.params.id),
    req.body as Record<string, unknown>,
    file,
    req.user,
  )
  res.json({ promotion })
})

export const deletePromotionController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await deletePromotion(String(req.params.id), req.user)
  res.json({ message: 'Promotion deleted' })
})
