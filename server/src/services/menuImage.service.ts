import { randomUUID } from 'node:crypto'
import { getDb } from '../config/database'
import { ApiError } from '../utils/ApiError'

/** Menu item photos: public Supabase Storage bucket, JPG / PNG / WEBP, max 4 MB. */
export const MENU_BUCKET = 'menu'
export const MAX_MENU_IMAGE_FILE_SIZE_BYTES = 4 * 1024 * 1024

const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])
const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** A file received by multer's memory storage (matches Express.Multer.File). */
export type MenuImageUpload = {
  buffer: Buffer
  originalname: string
  mimetype: string
  size: number
}

/**
 * Validates a photo picked for a menu item and returns its lowercase file
 * extension. `label` keeps the error messages specific.
 */
export function validateMenuImage(upload: MenuImageUpload, label = 'image'): string {
  if (upload.size > MAX_MENU_IMAGE_FILE_SIZE_BYTES) {
    throw new ApiError(
      413,
      `The ${label} is too large. Please upload a JPG, PNG, or WEBP image up to 4 MB.`,
    )
  }
  const ext = upload.originalname.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    throw new ApiError(400, `Please choose your ${label} as a JPG, PNG, or WEBP image.`)
  }
  // Reject mismatched types when the browser reported a specific type.
  const reportedType = upload.mimetype.toLowerCase()
  const expectedType = IMAGE_MIME_BY_EXTENSION[ext]
  if (reportedType && reportedType !== 'application/octet-stream' && expectedType && reportedType !== expectedType) {
    throw new ApiError(
      400,
      `The chosen file does not look like a ${ext.toUpperCase()} image. Please upload a JPG, PNG, or WEBP image.`,
    )
  }
  return `.${ext}`
}

/** Creates the public menu bucket on first use (safe to call repeatedly). */
export async function ensureMenuBucket(): Promise<void> {
  const { error } = await getDb().storage.createBucket(MENU_BUCKET, { public: true })
  if (!error) {
    return
  }
  const message = String(error.message ?? (error as { code?: unknown }).code ?? '')
  if (!/already exists|duplicate/i.test(message)) {
    throw new ApiError(500, 'Image storage is not available right now. Please try again later.')
  }
}

/**
 * Uploads a menu item photo to Supabase Storage and returns its public URL.
 * `ownerKey` groups a dish's photos into one folder (the menu item id, or a
 * fresh id while a new item is still being created).
 */
export async function uploadMenuImage(ownerKey: string, upload: MenuImageUpload): Promise<string> {
  const extension = validateMenuImage(upload)
  await ensureMenuBucket()
  const path = `items/${ownerKey}/${randomUUID()}${extension}`
  const { error } = await getDb()
    .storage
    .from(MENU_BUCKET)
    .upload(path, upload.buffer, {
      contentType: IMAGE_MIME_BY_EXTENSION[extension.slice(1)] ?? 'application/octet-stream',
      upsert: false,
    })
  if (error) {
    throw new ApiError(500, 'Could not save the menu image. Please try again.')
  }
  return getDb().storage.from(MENU_BUCKET).getPublicUrl(path).data.publicUrl
}

/** True when the URL points at a photo this API stored in the menu bucket. */
export function isStoredMenuImage(imageUrl: string): boolean {
  return imageUrl.includes(`/object/public/${MENU_BUCKET}/`)
}

/**
 * Best-effort removal of a stored photo (links hosted elsewhere, and empty
 * values, are ignored). Storage housekeeping never fails a request — a stray
 * file is harmless, whereas a failed save is not.
 */
export async function deleteStoredMenuImage(imageUrl: string): Promise<void> {
  if (!isStoredMenuImage(imageUrl)) {
    return
  }
  const marker = `/object/public/${MENU_BUCKET}/`
  const path = imageUrl.slice(imageUrl.indexOf(marker) + marker.length)
  if (!path) {
    return
  }
  try {
    await getDb().storage.from(MENU_BUCKET).remove([path])
  } catch {
    // Ignore: the photo is already gone or storage is unreachable.
  }
}
