import { randomUUID } from 'node:crypto'
import { getDb } from '../config/database'
import { ApiError } from '../utils/ApiError'
import {
  AVATARS_BUCKET,
  ensureAvatarBucket,
  MAX_AVATAR_FILE_SIZE_BYTES,
  validatePhotoUpload,
  type AvatarUpload,
} from './avatar.service'

/**
 * Group chat photos: the same public `avatars` bucket as profile photos
 * (grouped under `groups/<conversation id>/`), so uploads, public URLs and
 * best-effort cleanup all behave identically to profile pictures.
 */
export const MAX_GROUP_IMAGE_FILE_SIZE_BYTES = MAX_AVATAR_FILE_SIZE_BYTES

/** Content type sent with the stored object, keyed by the validated extension. */
const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

/**
 * Validates the picked photo and stores it for one group, returning its
 * public URL. The caller replaces the stored URL on the conversation row and
 * removes the previous file afterwards.
 */
export async function uploadGroupImage(conversationId: string, upload: AvatarUpload): Promise<string> {
  const extension = validatePhotoUpload(upload, 'group photo')
  await ensureAvatarBucket()
  const path = `groups/${conversationId}/${randomUUID()}${extension}`
  const { error } = await getDb()
    .storage
    .from(AVATARS_BUCKET)
    .upload(path, upload.buffer, {
      contentType: IMAGE_MIME_BY_EXTENSION[extension] ?? 'application/octet-stream',
      upsert: false,
    })
  if (error) {
    throw new ApiError(500, 'Could not save the group photo. Please try again.')
  }
  return getDb().storage.from(AVATARS_BUCKET).getPublicUrl(path).data.publicUrl
}
