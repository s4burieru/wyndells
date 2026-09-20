import { randomUUID } from 'node:crypto'
import { getDb } from '../config/db'
import { ApiError } from '../utils/ApiError'

/** Profile photos: public Supabase Storage bucket, JPG / PNG / WEBP, max 2 MB. */
export const AVATARS_BUCKET = 'avatars'
export const MAX_AVATAR_FILE_SIZE_BYTES = 2 * 1024 * 1024

const ALLOWED_AVATAR_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])
const AVATAR_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** A file received by multer's memory storage (matches Express.Multer.File). */
export type AvatarUpload = {
  buffer: Buffer
  originalname: string
  mimetype: string
  size: number
}

/** Validates the picked photo and returns its lowercase file extension. */
function avatarExtension(upload: AvatarUpload): string {
  if (upload.size > MAX_AVATAR_FILE_SIZE_BYTES) {
    throw new ApiError(
      413,
      'The profile photo is too large. Please upload a JPG, PNG, or WEBP image up to 2 MB.',
    )
  }
  const ext = upload.originalname.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_AVATAR_EXTENSIONS.has(ext)) {
    throw new ApiError(400, 'Please choose your profile photo as a JPG, PNG, or WEBP image.')
  }
  // Reject mismatched types when the browser reported a specific type.
  const reportedType = upload.mimetype.toLowerCase()
  const expectedType = AVATAR_MIME_BY_EXTENSION[ext]
  if (reportedType && reportedType !== 'application/octet-stream' && expectedType && reportedType !== expectedType) {
    throw new ApiError(
      400,
      `The chosen file does not look like a ${ext.toUpperCase()} image. Please upload a JPG, PNG, or WEBP photo.`,
    )
  }
  return `.${ext}`
}

/** Creates the public avatars bucket on first use (safe to call repeatedly). */
async function ensureAvatarBucket(): Promise<void> {
  const { error } = await getDb().storage.createBucket(AVATARS_BUCKET, { public: true })
  if (!error) {
    return
  }
  const message = String(error.message ?? (error as { code?: unknown }).code ?? '')
  if (!/already exists|duplicate/i.test(message)) {
    throw new ApiError(500, 'Photo storage is not available right now. Please try again later.')
  }
}

/**
 * Uploads a profile photo to Supabase Storage and returns its public URL.
 * `ownerKey` groups an account's photos into one folder (the user id, or a
 * fresh id while a new account is still being created).
 */
export async function uploadAvatar(ownerKey: string, upload: AvatarUpload): Promise<string> {
  const extension = avatarExtension(upload)
  await ensureAvatarBucket()
  const path = `staff/${ownerKey}/${randomUUID()}${extension}`
  const { error } = await getDb()
    .storage
    .from(AVATARS_BUCKET)
    .upload(path, upload.buffer, {
      contentType: AVATAR_MIME_BY_EXTENSION[extension.slice(1)] ?? 'application/octet-stream',
      upsert: false,
    })
  if (error) {
    throw new ApiError(500, 'Could not save the profile photo. Please try again.')
  }
  return getDb().storage.from(AVATARS_BUCKET).getPublicUrl(path).data.publicUrl
}

/** True when the URL points at a photo this API stored in the avatars bucket. */
export function isStoredAvatarUrl(avatarUrl: string): boolean {
  return avatarUrl.includes(`/object/public/${AVATARS_BUCKET}/`)
}

/**
 * Best-effort removal of a stored photo (links hosted elsewhere, and empty
 * values, are ignored). Storage housekeeping never fails a request — a stray
 * file is harmless, whereas a failed profile update is not.
 */
export async function deleteStoredAvatar(avatarUrl: string): Promise<void> {
  if (!isStoredAvatarUrl(avatarUrl)) {
    return
  }
  const marker = `/object/public/${AVATARS_BUCKET}/`
  const path = avatarUrl.slice(avatarUrl.indexOf(marker) + marker.length)
  if (!path) {
    return
  }
  try {
    await getDb().storage.from(AVATARS_BUCKET).remove([path])
  } catch {
    // Ignore: the photo is already gone or storage is unreachable.
  }
}