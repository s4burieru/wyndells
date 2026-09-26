import type { UserRole } from '../constants'

export const chatConversationsTable = 'chat_conversations'
export const chatParticipantsTable = 'chat_participants'
export const chatMessagesTable = 'chat_messages'

/** Values of the `chat_conversation_type` enum (see supabase/migrations/0005). */
export const CHAT_CONVERSATION_TYPES = ['direct', 'group'] as const
export type ChatConversationType = (typeof CHAT_CONVERSATION_TYPES)[number]

export const CHAT_MEMBER_ROLES = ['owner', 'member'] as const
export type ChatMemberRole = (typeof CHAT_MEMBER_ROLES)[number]

export const CHAT_MESSAGE_KINDS = ['text', 'image', 'file'] as const
export type ChatMessageKind = (typeof CHAT_MESSAGE_KINDS)[number]

/** Longest message body the composer accepts. */
export const MAX_CHAT_BODY_LENGTH = 4000

/** Longest group name. */
export const MAX_CHAT_TITLE_LENGTH = 80

/** Row shape as stored in the Supabase `chat_conversations` table. */
export type ChatConversationRow = {
  id: string
  type: ChatConversationType
  title: string
  direct_key: string | null
  created_by: string
  last_message_at: string | null
  created_at: string
  updated_at: string
}

export type ChatParticipantRow = {
  conversation_id: string
  user_id: string
  role: ChatMemberRole
  last_read_at: string
  joined_at: string
}

export type ChatMessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  kind: ChatMessageKind
  attachment_url: string
  attachment_name: string
  attachment_mime: string
  attachment_size: number
  edited_at: string | null
  deleted_at: string | null
  created_at: string
}

/** The slim user projection embedded by the PostgREST joins below. */
export type ChatUserRefRow = {
  id: string
  name: string
  role: UserRole
  avatar_url: string
}

export type ChatMessageWithSenderRow = ChatMessageRow & { sender: ChatUserRefRow | null }

export type ChatParticipantWithUserRow = ChatParticipantRow & { user: ChatUserRefRow | null }

export type ChatConversationWithParticipantsRow = ChatConversationRow & {
  participants: ChatParticipantWithUserRow[] | null
}

// ---------------------------------------------------------------------------
// Public JSON shapes returned to the client
// ---------------------------------------------------------------------------

export type ChatUserRef = {
  id: string
  name: string
  role: UserRole
  avatarUrl: string
}

export type ChatParticipant = ChatUserRef & {
  memberRole: ChatMemberRole
  lastReadAt: string
}

export type ChatAttachment = {
  url: string
  name: string
  mime: string
  size: number
}

export type ChatMessage = {
  _id: string
  conversationId: string
  sender: ChatUserRef
  body: string
  attachment: ChatAttachment | null
  editedAt: string | null
  deletedAt: string | null
  createdAt: string
}

export type ChatConversation = {
  _id: string
  type: ChatConversationType
  title: string
  participants: ChatParticipant[]
  lastMessage: ChatMessage | null
  unread: number
  createdAt: string
}

/** Select strings that embed the relations every chat payload needs. */
export const CHAT_MESSAGE_SELECT = '*, sender:sender_id(id, name, role, avatar_url)'
export const CHAT_CONVERSATION_SELECT =
  '*, participants:chat_participants(conversation_id, user_id, role, last_read_at, joined_at, user:user_id(id, name, role, avatar_url))'

export function toChatUserRef(row: ChatUserRefRow | null, fallbackId: string): ChatUserRef {
  return {
    id: row?.id ?? fallbackId,
    name: row?.name ?? 'Unknown staff member',
    role: row?.role ?? 'manager',
    avatarUrl: row?.avatar_url ?? '',
  }
}

export function toChatParticipant(row: ChatParticipantWithUserRow): ChatParticipant {
  return {
    ...toChatUserRef(row.user, row.user_id),
    memberRole: row.role,
    lastReadAt: row.last_read_at,
  }
}

/** True when the stored row is an attachment that was never deleted. */
function attachmentOf(row: ChatMessageRow): ChatAttachment | null {
  if (row.deleted_at || !row.attachment_url) return null
  return {
    url: row.attachment_url,
    name: row.attachment_name,
    mime: row.attachment_mime,
    size: row.attachment_size,
  }
}

export function toChatMessage(row: ChatMessageWithSenderRow): ChatMessage {
  const deleted = row.deleted_at !== null
  return {
    _id: row.id,
    conversationId: row.conversation_id,
    sender: toChatUserRef(row.sender, row.sender_id),
    // A deleted message keeps its row but loses its content.
    body: deleted ? '' : row.body,
    attachment: attachmentOf(row),
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
  }
}

/** Maps a conversation row that already embeds its participants. */
export function toChatConversation(
  row: ChatConversationWithParticipantsRow,
  lastMessage: ChatMessage | null,
  unread: number,
): ChatConversation {
  return {
    _id: row.id,
    type: row.type,
    title: row.title,
    participants: (row.participants ?? []).map(toChatParticipant),
    lastMessage,
    unread,
    createdAt: row.created_at,
  }
}
