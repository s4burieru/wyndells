import { randomUUID } from 'node:crypto'
import { getDb } from '../config/database'
import type { ChatAttachment } from '../models/Chat'
import { ApiError } from '../utils/ApiError'

/** Chat attachments: public Supabase Storage bucket, images + documents, max 10 MB. */
export const CHAT_ATTACHMENTS_BUCKET = 'chat-attachments'
export const MAX_CHAT_FILE_SIZE_BYTES = 10 * 1024 * 1024

const ALLOWED_CHAT_EXTENSIONS = new Set([
  // Images
  'jpg', 'jpeg', 'png', 'webp', 'gif',
  // Documents
  'pdf', 'txt', 'csv', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip',
])

/** A file received by multer's memory storage (matches Express.Multer.File). */
export type ChatUpload = {
  buffer: Buffer
  originalname: string
  mimetype: string
  size: number
}

/** Validates the picked file and returns its lowercase extension. */
function chatExtension(upload: ChatUpload): string {
  if (upload.size > MAX_CHAT_FILE_SIZE_BYTES) {
    throw new ApiError(413, 'That file is too large. Please choose a file up to 10 MB.')
  }
  const ext = upload.originalname.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_CHAT_EXTENSIONS.has(ext)) {
    throw new ApiError(
      400,
      'That file type is not supported. Please choose an image, PDF, document, spreadsheet, or zip file.',
    )
  }
  return `.${ext}`
}

/** Creates the public attachments bucket on first use (safe to call repeatedly). */
async function ensureAttachmentsBucket(): Promise<void> {
  const { error } = await getDb().storage.createBucket(CHAT_ATTACHMENTS_BUCKET, { public: true })
  if (!error) {
    return
  }
  const message = String(error.message ?? (error as { code?: unknown }).code ?? '')
  if (!/already exists|duplicate/i.test(message)) {
    throw new ApiError(500, 'File storage is not available right now. Please try again later.')
  }
}

/**
 * Uploads a chat attachment to Supabase Storage and returns the metadata the
 * message row stores alongside it. `senderKey` groups a person's uploads into
 * one folder so storage stays browsable.
 */
export async function uploadChatAttachment(senderKey: string, upload: ChatUpload): Promise<ChatAttachment> {
  const extension = chatExtension(upload)
  const mime = upload.mimetype.toLowerCase() || 'application/octet-stream'
  await ensureAttachmentsBucket()
  const path = `chat/${senderKey}/${randomUUID()}${extension}`
  const { error } = await getDb()
    .storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(path, upload.buffer, { contentType: mime, upsert: false })
  if (error) {
    throw new ApiError(500, 'Could not upload the file. Please try again.')
  }
  const { data } = getDb().storage.from(CHAT_ATTACHMENTS_BUCKET).getPublicUrl(path)
  return {
    url: data.publicUrl,
    name: upload.originalname.slice(0, 255),
    mime,
    size: upload.size,
  }
}

/** True when the URL points at a file this API stored in the chat bucket. */
export function isStoredChatAttachmentUrl(url: string): boolean {
  return url.includes(`/object/public/${CHAT_ATTACHMENTS_BUCKET}/`)
}

/**
 * Best-effort removal of a stored attachment (used when a message is deleted).
 * Storage housekeeping never fails a request — a stray file is harmless,
 * whereas a failed delete is not.
 */
export async function deleteStoredChatAttachment(url: string): Promise<void> {
  if (!isStoredChatAttachmentUrl(url)) return
  const marker = `/object/public/${CHAT_ATTACHMENTS_BUCKET}/`
  const path = url.slice(url.indexOf(marker) + marker.length)
  if (!path) return
  try {
    await getDb().storage.from(CHAT_ATTACHMENTS_BUCKET).remove([path])
  } catch {
    // Ignore: the file is already gone or storage is unreachable.
  }
}
