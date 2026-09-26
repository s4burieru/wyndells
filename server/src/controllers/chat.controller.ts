import type { Response } from 'express'
import type { AuthedRequest } from '../middleware/auth'
import { ApiError } from '../utils/ApiError'
import { asyncHandler } from '../utils/asyncHandler'
import { assertUuid, requireFields } from '../utils/validate'
import {
  addParticipants,
  createDirect,
  createGroup,
  listConversations,
  listDirectory,
  listMessages,
  markConversationRead,
  removeParticipant,
  renameConversation,
  unreadSummary,
} from '../services/chat.service'
import { uploadChatAttachment, type ChatUpload } from '../services/chatUpload.service'
import {
  announceConversation,
  emitToConversation,
  forgetConversationForUser,
} from '../sockets/chatEvents'

/**
 * Chat routes are open to everyone who can sign in to the staff portal
 * (administrators and managers); `authenticateUser` is applied by the router.
 * Membership checks live in the service layer.
 */

export const listConversationsController = asyncHandler(
  async (req: AuthedRequest, res: Response) => {
    res.json({ conversations: await listConversations(req.user.id) })
  },
)

export const createConversationController = asyncHandler(
  async (req: AuthedRequest, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>
    const actor = { id: req.user.id, role: req.user.role }

    if (body.type === 'direct') {
      requireFields(body, ['userId'])
      const conversation = await createDirect(actor, String(body.userId))
      await announceConversation(
        conversation,
        conversation.participants.map((participant) => participant.id),
      )
      res.status(201).json({ conversation })
      return
    }

    if (body.type === 'group') {
      requireFields(body, ['title'])
      if (!Array.isArray(body.memberIds)) {
        throw new ApiError(400, 'The field "memberIds" must be a list of staff member ids.')
      }
      const conversation = await createGroup(
        actor,
        String(body.title),
        body.memberIds.map(String),
      )
      await announceConversation(
        conversation,
        conversation.participants.map((participant) => participant.id),
      )
      res.status(201).json({ conversation })
      return
    }

    throw new ApiError(400, 'The field "type" must be either "direct" or "group".')
  },
)

export const listMessagesController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const conversationId = assertUuid(String(req.params.id), 'conversation')
  const before =
    typeof req.query.before === 'string' && req.query.before !== '' ? req.query.before : undefined
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined
  res.json(await listMessages(conversationId, req.user.id, before, limit))
})

export const renameConversationController = asyncHandler(
  async (req: AuthedRequest, res: Response) => {
    const conversationId = assertUuid(String(req.params.id), 'conversation')
    const body = (req.body ?? {}) as Record<string, unknown>
    requireFields(body, ['title'])
    const conversation = await renameConversation(
      { id: req.user.id, role: req.user.role },
      conversationId,
      String(body.title),
    )
    emitToConversation(conversationId, 'conversation:updated', conversation)
    res.json({ conversation })
  },
)

export const addMembersController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const conversationId = assertUuid(String(req.params.id), 'conversation')
  const body = (req.body ?? {}) as Record<string, unknown>
  if (!Array.isArray(body.memberIds)) {
    throw new ApiError(400, 'The field "memberIds" must be a list of staff member ids.')
  }
  const { conversation, addedIds } = await addParticipants(
    { id: req.user.id, role: req.user.role },
    conversationId,
    body.memberIds.map(String),
  )
  if (addedIds.length > 0) {
    // New members learn about the conversation (and join its live room);
    // everyone already in the room refreshes its participant list.
    await announceConversation(conversation, addedIds)
    emitToConversation(conversationId, 'conversation:updated', conversation)
  }
  res.json({ conversation })
})

export const removeMemberController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const conversationId = assertUuid(String(req.params.id), 'conversation')
  const rawUserId = String(req.params.userId)
  // "me" lets a client leave without needing its own id in the path.
  const targetUserId = rawUserId === 'me' ? req.user.id : assertUuid(rawUserId, 'member')

  const { removedUserId } = await removeParticipant(
    { id: req.user.id, role: req.user.role },
    conversationId,
    targetUserId,
  )
  await forgetConversationForUser(removedUserId, conversationId)
  emitToConversation(conversationId, 'participant:removed', {
    conversationId,
    userId: removedUserId,
  })
  res.json({ removed: true })
})

export const markReadController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const conversationId = assertUuid(String(req.params.id), 'conversation')
  const lastReadAt = await markConversationRead(conversationId, req.user.id)
  // Shared with the room so read receipts and badges update live.
  emitToConversation(conversationId, 'read:updated', {
    conversationId,
    userId: req.user.id,
    lastReadAt,
  })
  res.json({ lastReadAt })
})

export const unreadCountController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  res.json(await unreadSummary(req.user.id))
})

export const directoryController = asyncHandler(async (req: AuthedRequest, res: Response) => {
  res.json({ users: await listDirectory(req.user.id) })
})

export const uploadAttachmentController = asyncHandler(
  async (req: AuthedRequest, res: Response) => {
    const file = (req as AuthedRequest & { file?: ChatUpload }).file
    if (!file) {
      throw new ApiError(400, 'Please choose a file to upload.')
    }
    const attachment = await uploadChatAttachment(req.user.id, file)
    res.status(201).json({ attachment })
  },
)
