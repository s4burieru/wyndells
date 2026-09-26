import type { Server as HttpServer } from 'node:http'
import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import { getDb } from '../config/database'
import { getJwtSecret } from '../middleware/auth'
import {
  deleteMessage,
  editMessage,
  getConversationIdsForUser,
  markConversationRead,
  sendMessage,
} from '../services/chat.service'
import { ApiError } from '../utils/ApiError'
import { assertUuid } from '../utils/validate'
import {
  setChatServer,
  type ChatServer,
  type ChatSocketData,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from './chatEvents'

/** Friendly message for an ack reply; unexpected failures get a generic one. */
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

/**
 * Attaches the staff-chat WebSocket to the HTTP server.
 *
 * Connections are authenticated with the same JWT the REST API issues: the
 * handshake carries `auth: { token }`, the signature is verified, and the
 * users row is re-read so deactivated accounts are refused immediately.
 * On connect, each socket joins its own user room plus one room per
 * conversation, which is how broadcasts find the right people.
 */
export function attachChatSocket(httpServer: HttpServer, clientOrigin: string): ChatServer {
  const io: ChatServer = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    ChatSocketData
  >(httpServer, {
    path: '/socket.io',
    cors: { origin: clientOrigin, credentials: true },
  })
  setChatServer(io)

  io.use(async (socket, next) => {
    try {
      const auth = socket.handshake.auth as { token?: unknown } | undefined
      const token = typeof auth?.token === 'string' ? auth.token : ''
      if (!token) {
        throw new ApiError(401, 'Authentication required. Please sign in.')
      }
      const decoded = jwt.verify(token, getJwtSecret())
      if (typeof decoded === 'string' || !decoded.sub) {
        throw new ApiError(401, 'Invalid or expired session. Please sign in again.')
      }
      const { data, error } = await getDb()
        .from('users')
        .select('id, name, role, is_active')
        .eq('id', String(decoded.sub))
        .maybeSingle()
      if (error || !data || !data.is_active) {
        throw new ApiError(401, 'Your account is unavailable. Please contact support.')
      }
      socket.data.user = { id: String(data.id), role: data.role, name: String(data.name) }
      next()
    } catch (error) {
      next(error instanceof Error ? error : new Error('Authentication required.'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user
    if (!user) {
      socket.disconnect(true)
      return
    }
    const actor = { id: user.id, role: user.role }

    // User room = every tab of this person; conversation rooms = live threads.
    void (async () => {
      await socket.join(`user:${user.id}`)
      try {
        const conversationIds = await getConversationIdsForUser(user.id)
        if (conversationIds.length > 0) {
          await socket.join(conversationIds.map((id) => `conv:${id}`))
        }
      } catch (error) {
        console.warn('chat: could not join conversation rooms:', error)
      }
    })()

    /** Sends the message to the whole room (including the sender's tabs). */
    socket.on('message:send', async (payload, ack) => {
      try {
        const conversationId = assertUuid(String(payload?.conversationId ?? ''), 'conversation')
        const message = await sendMessage(actor, conversationId, {
          body: payload?.body,
          attachment: payload?.attachment,
        })
        io.to(`conv:${conversationId}`).emit('message:new', message)
        ack?.({ ok: true, data: { message } })
      } catch (error) {
        ack?.({ ok: false, error: errorMessage(error, 'Could not send the message.') })
      }
    })

    socket.on('message:edit', async (payload, ack) => {
      try {
        const messageId = assertUuid(String(payload?.messageId ?? ''), 'message')
        const message = await editMessage(actor, messageId, String(payload?.body ?? ''))
        io.to(`conv:${message.conversationId}`).emit('message:updated', message)
        ack?.({ ok: true, data: { message } })
      } catch (error) {
        ack?.({ ok: false, error: errorMessage(error, 'Could not update the message.') })
      }
    })

    socket.on('message:delete', async (payload, ack) => {
      try {
        const messageId = assertUuid(String(payload?.messageId ?? ''), 'message')
        const message = await deleteMessage(actor, messageId)
        io.to(`conv:${message.conversationId}`).emit('message:deleted', message)
        ack?.({ ok: true, data: { message } })
      } catch (error) {
        ack?.({ ok: false, error: errorMessage(error, 'Could not delete the message.') })
      }
    })

    socket.on('read:mark', async (payload, ack) => {
      try {
        const conversationId = assertUuid(String(payload?.conversationId ?? ''), 'conversation')
        const lastReadAt = await markConversationRead(conversationId, user.id)
        io.to(`conv:${conversationId}`).emit('read:updated', {
          conversationId,
          userId: user.id,
          lastReadAt,
        })
        ack?.({ ok: true, data: { lastReadAt } })
      } catch (error) {
        ack?.({ ok: false, error: errorMessage(error, 'Could not update the conversation.') })
      }
    })

    // Typing is ephemeral: broadcast to the room (minus the sender) only when
    // this socket already belongs to it — no database round trip per keystroke.
    socket.on('typing', (payload) => {
      try {
        const conversationId = assertUuid(String(payload?.conversationId ?? ''), 'conversation')
        if (!socket.rooms.has(`conv:${conversationId}`)) return
        socket.to(`conv:${conversationId}`).emit('typing', {
          conversationId,
          userId: user.id,
          name: user.name,
          isTyping: payload?.isTyping !== false,
        })
      } catch {
        // Malformed typing events are harmless; drop them.
      }
    })
  })

  return io
}
