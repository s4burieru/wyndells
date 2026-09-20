import { type Request } from 'express'
import multer from 'multer'
import { MAX_AVATAR_FILE_SIZE_BYTES, type AvatarUpload } from '../services/avatar.service'

/**
 * Parses `multipart/form-data` staff profile updates, where the photo arrives
 * as the `avatar` field. Requests sent as JSON (no photo change) skip parsing
 * and pass straight through, so the same endpoint accepts both content types.
 */
export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_FILE_SIZE_BYTES },
})

/** The `avatar` file attached to a request, when the caller uploaded one. */
export function uploadedAvatar(req: Request): AvatarUpload | undefined {
  return (req as Request & { file?: AvatarUpload }).file
}