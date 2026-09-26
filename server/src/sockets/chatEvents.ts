import type { Server } from 'socket.io'
import type { ChatConversation, ChatMessage } from '../models/Chat'

/**
 * Shared Socket.io surface for the staff chat: the event maps both sides use,
 * plus a module-level bridge so REST handlers can reach connected clients.
 *
 * The HTTP API and the socket server share one process, so `setChatServer`
 * (called once when the socket server attaches, see sockets/chat.socket.ts)
 * is all the controllers need. Every helper is a no-op before that or when
 * nobody is listening.
 */

/** Payload a client sends with `message:send`. */export type MessageSendPayload = {
  conversationId: string
  body?: string
  attachment?: { url: string; name: string; mime: string; size: number } | null
}

/** Envelope every acknowledged client → server event replies with. */
export type ChatAck<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

/** Events the browser may emit. */
export type ClientToServerEvents = {
  'conversation:join': (conversationId: string, ack: (res: ChatAck) => void) => void
  'message:send': (payload: MessageSendPayload, ack: (res: ChatAck<{ message: ChatMessage }>) => void) => void
  'message:edit': (
    payload: { messageId: string; body: string },
    ack: (res: ChatAck<{ message: ChatMessage }>) => void,
  ) => void
  'message:delete': (
    payload: { messageId: string },
    ack: (res: ChatAck<{ message: ChatMessage }>) => void,
  ) => void
  'read:mark': (payload: { conversationId: string }, ack: (res: ChatAck<{ lastReadAt: string }>) => void) => void
  'typing': (payload: { conversationId: string; isTyping: boolean }) => void
}

/** Events the server pushes to the browser. */
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

/** Per-socket state set by the auth middleware: the signed-in staff member. */
export type ChatSocketData = { user?: { id: string; role: 'admin' | 'manager'; name: string } }

export type ChatServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  ChatSocketData
>

let chatIo: ChatServer | null = null

export function setChatServer(server: ChatServer): void {
  chatIo = server
}

/**
 * Untyped view of one room's emitter. socket.io's generic `emit` cannot be
 * called with an event name that is generic over our map, so the cast happens
 * once here — the caller-facing signatures below keep it type safe, and our
 * events carry no acknowledgements, so the runtime shapes are identical.
 */
type RoomEmitter = { emit(event: string, payload: unknown): void }

function roomEmitter(room: string): RoomEmitter | undefined {
  if (!chatIo) return undefined
  return chatIo.to(room) as unknown as RoomEmitter
}

/** Emits to every socket of one signed-in person (all of their tabs). */
export function emitToUser<E extends keyof ServerToClientEvents>(
  userId: string,
  event: E,
  payload: Parameters<ServerToClientEvents[E]>[0],
): void {
  roomEmitter(`user:${userId}`)?.emit(event, payload)
}

/** Emits to everyone currently connected to a conversation. */
export function emitToConversation<E extends keyof ServerToClientEvents>(
  conversationId: string,
  event: E,
  payload: Parameters<ServerToClientEvents[E]>[0],
): void {
  roomEmitter(`conv:${conversationId}`)?.emit(event, payload)
}

/**
 * Puts every connected socket of the given people into the conversation room
 * and tells their tabs about the conversation — used when a conversation is
 * created and when someone is added to a group, so they start receiving live
 * messages immediately.
 */
export async function announceConversation(
  conversation: ChatConversation,
  memberIds: string[],
): Promise<void> {
  if (memberIds.length === 0) return
  if (chatIo) {
    await chatIo.in(memberIds.map((id) => `user:${id}`)).socketsJoin(`conv:${conversation._id}`)
  }
  for (const userId of memberIds) {
    emitToUser(userId, 'conversation:created', conversation)
  }
}

/**
 * Removes every connected socket of one person from a conversation room and
 * tells their tabs the conversation is gone from their list.
 */
export async function forgetConversationForUser(
  userId: string,
  conversationId: string,
): Promise<void> {
  await chatIo?.in(`user:${userId}`).socketsLeave(`conv:${conversationId}`)
  emitToUser(userId, 'conversation:removed', { conversationId })
}
