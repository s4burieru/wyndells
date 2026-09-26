import { io, type Socket } from 'socket.io-client'
import { getToken } from '@/services/api/client'
import type { ChatAttachment, ChatConversation, ChatMessage } from '@/types'

/**
 * Socket.io client for the staff chat. One shared connection carries every
 * live event; it authenticates with the same JWT the REST API uses (read at
 * each connection attempt, so a refreshed token is picked up automatically)
 * and reconnects on its own when the network drops.
 */

export type ChatAck<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

/** Events pushed by the server. */
export type ServerToClientEvents = {
  'message:new': (message: ChatMessage) => void
  'message:updated': (message: ChatMessage) => void
  'message:deleted': (message: ChatMessage) => void
  'conversation:created': (conversation: ChatConversation) => void
  'conversation:updated': (conversation: ChatConversation) => void
  'conversation:removed': (payload: { conversationId: string }) => void
  'participant:added': (payload: { conversationId: string; memberIds: string[] }) => void
  'participant:removed': (payload: { conversationId: string; userId: string }) => void
  'read:updated': (payload: { conversationId: string; userId: string; lastReadAt: string }) => void
  'typing': (payload: { conversationId: string; userId: string; name: string; isTyping: boolean }) => void
}

/** Events this client emits. */
export type ClientToServerEvents = {
  'message:send': (
    payload: { conversationId: string; body?: string; attachment?: ChatAttachment | null },
    ack: (res: ChatAck<{ message: ChatMessage }>) => void,
  ) => void
  'message:edit': (
    payload: { messageId: string; body: string },
    ack: (res: ChatAck<{ message: ChatMessage }>) => void,
  ) => void
  'message:delete': (payload: { messageId: string }, ack: (res: ChatAck<{ message: ChatMessage }>) => void) => void
  'typing': (payload: { conversationId: string; isTyping: boolean }) => void
}

type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>

const ACK_TIMEOUT_MS = 8000

let socket: ChatSocket | null = null

/** Shared connection; created lazily so a signed-out visitor never opens one. */
export function getChatSocket(): ChatSocket {
  if (!socket) {
    socket = io({
      autoConnect: false,
      // Same origin as the REST API (proxied in dev), fresh token per attempt.
      auth: (callback) => callback({ token: getToken() }),
    }) as ChatSocket
  }
  return socket
}

/** Opens the connection (idempotent) — called by the layout and the chat page. */
export function connectChatSocket(): void {
  const instance = getChatSocket()
  if (!instance.connected) {
    instance.connect()
  }
}

/** Closes the connection — called when the signed-in session goes away. */
export function disconnectChatSocket(): void {
  socket?.disconnect()
}

/** Runs an acknowledged socket call, failing with a friendly message. */
function withAck<T>(
  register: (ack: (res: ChatAck<T>) => void) => void,
  failureMessage: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error('The server took too long to respond. Please try again.'))
      }
    }, ACK_TIMEOUT_MS)

    register((res) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (res && res.ok) {
        resolve(res.data as T)
      } else {
        reject(new Error(res && !res.ok ? res.error : failureMessage))
      }
    })
  })
}

/** Sends a message; the `message:new` broadcast echoes it back to every tab. */
export function sendChatMessage(payload: {
  conversationId: string
  body?: string
  attachment?: ChatAttachment | null
}): Promise<ChatMessage> {
  return withAck<{ message: ChatMessage }>(
    (ack) => getChatSocket().emit('message:send', payload, ack),
    'Could not send the message. Please try again.',
  ).then((data) => data.message)
}

export function editChatMessage(messageId: string, body: string): Promise<ChatMessage> {
  return withAck<{ message: ChatMessage }>(
    (ack) => getChatSocket().emit('message:edit', { messageId, body }, ack),
    'Could not update the message. Please try again.',
  ).then((data) => data.message)
}

export function deleteChatMessage(messageId: string): Promise<ChatMessage> {
  return withAck<{ message: ChatMessage }>(
    (ack) => getChatSocket().emit('message:delete', { messageId }, ack),
    'Could not delete the message. Please try again.',
  ).then((data) => data.message)
}

/** Fire-and-forget typing signal; the receiver expires it after a few seconds. */
export function emitTyping(conversationId: string, isTyping: boolean): void {
  if (!getChatSocket().connected) return
  getChatSocket().emit('typing', { conversationId, isTyping })
}
