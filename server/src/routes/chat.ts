import { Router } from 'express'
import multer from 'multer'
import {
  addMembersController,
  createConversationController,
  directoryController,
  listConversationsController,
  listMessagesController,
  markReadController,
  removeMemberController,
  renameConversationController,
  unreadCountController,
  uploadAttachmentController,
} from '../controllers/chat.controller'
import { authenticateUser } from '../middleware/auth'
import { MAX_CHAT_FILE_SIZE_BYTES } from '../services/chatUpload.service'

const router = Router()

// Attachments arrive as multipart/form-data; everything else is JSON.
const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CHAT_FILE_SIZE_BYTES },
})

// Everyone who can sign in to the staff portal may chat — there is no role
// gate; conversation membership is enforced inside the service.
router.use(authenticateUser)

router.get('/conversations', listConversationsController)
router.post('/conversations', createConversationController)
router.get('/conversations/:id/messages', listMessagesController)
router.patch('/conversations/:id', renameConversationController)
router.post('/conversations/:id/participants', addMembersController)
router.delete('/conversations/:id/participants/:userId', removeMemberController)
router.post('/conversations/:id/read', markReadController)
router.get('/unread-count', unreadCountController)
router.get('/directory', directoryController)
router.post('/uploads', attachmentUpload.single('file'), uploadAttachmentController)

export default router
