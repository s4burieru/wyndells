import { Router } from 'express'
import multer from 'multer'
import {
  addMembersController,
  createConversationController,
  directoryController,
  hideConversationController,
  listConversationsController,
  listMessagesController,
  markReadController,
  removeGroupImageController,
  removeMemberController,
  renameConversationController,
  unreadCountController,
  updateGroupImageController,
  updateMemberRoleController,
  uploadAttachmentController,
} from '../controllers/chat.controller'
import { authenticateUser, authorizePermission } from '../middleware/auth'
import { avatarUpload } from '../middleware/uploads'
import { MAX_CHAT_FILE_SIZE_BYTES } from '../services/chatUpload.service'

const router = Router()

// Attachments arrive as multipart/form-data; everything else is JSON.
const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CHAT_FILE_SIZE_BYTES },
})

// Chat is one permission away from being switched off for a whole role — the
// page, the REST routes and the WebSocket handshake all check `chat.use`.
// Conversation membership is enforced inside the service.
router.use(authenticateUser, authorizePermission('chat.use'))

router.get('/conversations', listConversationsController)
router.post('/conversations', createConversationController)
router.get('/conversations/:id/messages', listMessagesController)
router.patch('/conversations/:id', renameConversationController)
// Group photos share the profile-photo parser (same 2 MB memory-storage
// limits); only the multipart field name differs — `image`, not `avatar`.
router.patch('/conversations/:id/image', avatarUpload.single('image'), updateGroupImageController)
router.delete('/conversations/:id/image', removeGroupImageController)
router.delete('/conversations/:id', hideConversationController)
router.post('/conversations/:id/participants', addMembersController)
router.patch('/conversations/:id/participants/:userId/role', updateMemberRoleController)
router.delete('/conversations/:id/participants/:userId', removeMemberController)
router.post('/conversations/:id/read', markReadController)
router.get('/unread-count', unreadCountController)
router.get('/directory', directoryController)
router.post('/uploads', attachmentUpload.single('file'), uploadAttachmentController)

export default router
