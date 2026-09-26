import { getDb } from '../config/database'
import {
  CHAT_CONVERSATION_SELECT,
  CHAT_MESSAGE_SELECT,
  chatConversationsTable,
  chatMessagesTable,
  chatParticipantsTable,
  MAX_CHAT_BODY_LENGTH,
  MAX_CHAT_TITLE_LENGTH,
  toChatConversation,
  toChatMessage,
  type ChatAttachment,
  type ChatConversation,
  type ChatConversationWithParticipantsRow,
  type ChatMessage,
  type ChatMessageKind,
  type ChatMessageWithSenderRow,
  type ChatUserRef,
} from '../models/Chat'
import { usersTable } from '../models/User'
import { ApiError } from '../utils/ApiError'
import { assertUuid } from '../utils/validate'
import {
  deleteStoredChatAttachment,
  isStoredChatAttachmentUrl,
  MAX_CHAT_FILE_SIZE_BYTES,
} from './chatUpload.service'

/** Who is acting: the signed-in staff member (admin or manager). */
export type ChatActor = { id: string; role: 'admin' | 'manager' }

/** How many messages one page of history holds. */
const DEFAULT_MESSAGE_PAGE = 50

/** How many groups one person can belong to. */
const MAX_GROUP_MEMBERS = 100

/**
 * Newest messages fetched in one pass to seed the conversation-list previews
 * across all of a person's conversations.
 */
const PREVIEW_MESSAGE_LIMIT = 300

// ---------------------------------------------------------------------------
// Lookups & guards
// ---------------------------------------------------------------------------

async function loadConversation(conversationId: string): Promise<ChatConversationWithParticipantsRow> {
  const { data, error } = await getDb()
    .from(chatConversationsTable)
    .select(CHAT_CONVERSATION_SELECT)
    .eq('id', conversationId)
    .maybeSingle()
  if (error || !data) {
    throw new ApiError(404, 'Conversation not found.')
  }
  return data as ChatConversationWithParticipantsRow
}

/** Throws unless the person belongs to the conversation. */
async function assertMember(conversationId: string, userId: string): Promise<void> {
  const { data, error } = await getDb()
    .from(chatParticipantsTable)
    .select('conversation_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    throw new ApiError(500, 'Could not load the conversation.')
  }
  if (!data) {
    throw new ApiError(403, 'You are not a member of this conversation.')
  }
}

/**
 * Conversation settings (rename / add / remove) are open to every member and,
 * as a safety net, to administrators — who can moderate any conversation.
 */
function assertCanManage(actor: ChatActor, row: ChatConversationWithParticipantsRow): void {
  const isMember = (row.participants ?? []).some((participant) => participant.user_id === actor.id)
  if (!isMember && actor.role !== 'admin') {
    throw new ApiError(403, 'You are not a member of this conversation.')
  }
}

/** Confirms every id is an active staff account; throws when one is not. */
async function assertActiveUsers(userIds: string[]): Promise<void> {
  const { data, error } = await getDb()
    .from(usersTable)
    .select('id')
    .in('id', userIds)
    .eq('is_active', true)
  if (error) {
    throw new ApiError(500, 'Could not load staff members.')
  }
  if ((data ?? []).length !== userIds.length) {
    throw new ApiError(400, 'One or more selected staff members are no longer available.')
  }
}

/** Unique key for a direct pair, so two people can only have one conversation. */
function directKey(a: string, b: string): string {
  return [a, b].sort().join(':')
}

// ---------------------------------------------------------------------------
// Building payloads
// ---------------------------------------------------------------------------

/** Latest message in one conversation (null when it has none). */
async function lastMessageOf(conversationId: string): Promise<ChatMessage | null> {
  const { data, error } = await getDb()
    .from(chatMessagesTable)
    .select(CHAT_MESSAGE_SELECT)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return toChatMessage(data as ChatMessageWithSenderRow)
}

/** Unread messages for one person: everything since they last opened it. */
async function unreadFor(
  conversationId: string,
  userId: string,
  lastReadAt: string,
): Promise<number> {
  const { count, error } = await getDb()
    .from(chatMessagesTable)
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .gt('created_at', lastReadAt)
  if (error) return 0
  return count ?? 0
}

/** Full conversation payload (participants + preview + unread count). */
async function buildConversation(
  row: ChatConversationWithParticipantsRow,
  userId: string,
): Promise<ChatConversation> {
  const mine = (row.participants ?? []).find((participant) => participant.user_id === userId)
  const [lastMessage, unread] = await Promise.all([
    lastMessageOf(row.id),
    mine ? unreadFor(row.id, userId, mine.last_read_at) : Promise.resolve(0),
  ])
  return toChatConversation(row, lastMessage, unread)
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** Conversation ids a person belongs to — the socket rooms they should join. */
export async function getConversationIdsForUser(userId: string): Promise<string[]> {
  const { data, error } = await getDb()
    .from(chatParticipantsTable)
    .select('conversation_id')
    .eq('user_id', userId)
  if (error) {
    throw new ApiError(500, 'Could not load conversations.')
  }
  return (data ?? []).map((row) => String(row.conversation_id))
}

/** Every conversation for one person, most recently active first. */
export async function listConversations(userId: string): Promise<ChatConversation[]> {
  const db = getDb()
  const { data: mine, error: mineError } = await db
    .from(chatParticipantsTable)
    .select('conversation_id, last_read_at')
    .eq('user_id', userId)
  if (mineError) {
    throw new ApiError(500, 'Could not load conversations.')
  }
  const rows = mine ?? []
  if (rows.length === 0) return []

  const conversationIds = rows.map((row) => String(row.conversation_id))
  const [{ data: conversations, error }, { data: recent }] = await Promise.all([
    db
      .from(chatConversationsTable)
      .select(CHAT_CONVERSATION_SELECT)
      .in('id', conversationIds),
    // One pass seeds every list preview; unread counts come from exact
    // per-conversation counts below, so a cap here never miscounts.
    db
      .from(chatMessagesTable)
      .select(CHAT_MESSAGE_SELECT)
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })
      .limit(PREVIEW_MESSAGE_LIMIT),
  ])
  if (error || !conversations) {
    throw new ApiError(500, 'Could not load conversations.')
  }

  const previewByConversation = new Map<string, ChatMessage>()
  for (const row of recent ?? []) {
    const message = row as ChatMessageWithSenderRow
    if (!previewByConversation.has(message.conversation_id)) {
      previewByConversation.set(message.conversation_id, toChatMessage(message))
    }
  }

  const unreadByConversation = new Map(
    await Promise.all(
      rows.map(
        async (row) =>
          [
            String(row.conversation_id),
            await unreadFor(String(row.conversation_id), userId, row.last_read_at),
          ] as const,
      ),
    ),
  )

  return (conversations as ChatConversationWithParticipantsRow[])
    // Most recently active first; conversations with no messages yet sort by age.
    .sort(
      (a, b) =>
        new Date(b.last_message_at ?? b.created_at).getTime() -
        new Date(a.last_message_at ?? a.created_at).getTime(),
    )
    .map((row) =>
      toChatConversation(row, previewByConversation.get(row.id) ?? null, unreadByConversation.get(row.id) ?? 0),
    )
}

/** One conversation, with its preview and the caller's unread count. */
export async function getConversation(conversationId: string, userId: string): Promise<ChatConversation> {
  const row = await loadConversation(conversationId)
  await assertMember(conversationId, userId)
  return buildConversation(row, userId)
}

/** Paged message history, newest page first (returned oldest → newest). */
export async function listMessages(
  conversationId: string,
  userId: string,
  before?: string,
  limit = DEFAULT_MESSAGE_PAGE,
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  await assertMember(conversationId, userId)

  if (before !== undefined) {
    if (Number.isNaN(Date.parse(before))) {
      throw new ApiError(400, 'Invalid message cursor.')
    }
  }
  const capped = Math.min(Math.max(Number.isFinite(limit) ? limit : DEFAULT_MESSAGE_PAGE, 1), 100)

  let query = getDb()
    .from(chatMessagesTable)
    .select(CHAT_MESSAGE_SELECT)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(capped + 1)
  if (before) {
    query = query.lt('created_at', before)
  }
  const { data, error } = await query
  if (error) {
    throw new ApiError(500, 'Could not load messages.')
  }

  const rows = (data ?? []) as ChatMessageWithSenderRow[]
  const hasMore = rows.length > capped
  const page = hasMore ? rows.slice(0, capped) : rows
  return { messages: page.map(toChatMessage).reverse(), hasMore }
}

/** Staff directory for the new-chat pickers (everyone but yourself). */
export async function listDirectory(userId: string): Promise<ChatUserRef[]> {
  const { data, error } = await getDb()
    .from(usersTable)
    .select('id, name, role, avatar_url')
    .eq('is_active', true)
    .neq('id', userId)
    .order('name', { ascending: true })
  if (error) {
    throw new ApiError(500, 'Could not load staff members.')
  }
  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    role: row.role,
    avatarUrl: String(row.avatar_url ?? ''),
  }))
}

/** Unread totals used by the sidebar badge and live refreshes. */
export async function unreadSummary(
  userId: string,
): Promise<{ total: number; conversations: { id: string; unread: number }[] }> {
  const { data: mine, error } = await getDb()
    .from(chatParticipantsTable)
    .select('conversation_id, last_read_at')
    .eq('user_id', userId)
  if (error) {
    throw new ApiError(500, 'Could not load conversations.')
  }
  const counts = await Promise.all(
    (mine ?? []).map(async (row) => ({
      id: String(row.conversation_id),
      unread: await unreadFor(String(row.conversation_id), userId, row.last_read_at),
    })),
  )
  return { total: counts.reduce((sum, item) => sum + item.unread, 0), conversations: counts }
}

// ---------------------------------------------------------------------------
// Creating
// ---------------------------------------------------------------------------

/** Finds or starts the direct conversation between two staff members. */
export async function createDirect(actor: ChatActor, otherUserId: string): Promise<ChatConversation> {
  if (actor.id === otherUserId) {
    throw new ApiError(400, 'You cannot message yourself.')
  }
  const otherId = assertUuid(otherUserId, 'user')
  await assertActiveUsers([otherId])

  const key = directKey(actor.id, otherId)
  const db = getDb()
  const { data: existing, error: existingError } = await db
    .from(chatConversationsTable)
    .select(CHAT_CONVERSATION_SELECT)
    .eq('direct_key', key)
    .maybeSingle()
  if (existingError) {
    throw new ApiError(500, 'Could not start the conversation.')
  }

  if (existing) {
    // Both people may have left earlier; re-add them so the conversation is
    // usable again instead of silently empty.
    await db.from(chatParticipantsTable).upsert(
      [
        { conversation_id: existing.id, user_id: actor.id, role: 'member' },
        { conversation_id: existing.id, user_id: otherId, role: 'member' },
      ],
      { onConflict: 'conversation_id,user_id', ignoreDuplicates: true },
    )
    const row = await loadConversation(String(existing.id))
    return buildConversation(row, actor.id)
  }

  const { data: created, error } = await db
    .from(chatConversationsTable)
    .insert({ type: 'direct', title: '', direct_key: key, created_by: actor.id })
    .select('id')
    .single()
  if (error || !created) {
    // Lost a race against the same request: the unique direct_key picked a
    // winner, so reload that conversation instead of failing.
    const { data: raced } = await db
      .from(chatConversationsTable)
      .select('id')
      .eq('direct_key', key)
      .maybeSingle()
    if (!raced) {
      throw new ApiError(500, 'Could not start the conversation.')
    }
    await db.from(chatParticipantsTable).upsert(
      [
        { conversation_id: raced.id, user_id: actor.id, role: 'member' },
        { conversation_id: raced.id, user_id: otherId, role: 'member' },
      ],
      { onConflict: 'conversation_id,user_id', ignoreDuplicates: true },
    )
    const row = await loadConversation(String(raced.id))
    return buildConversation(row, actor.id)
  }

  await db.from(chatParticipantsTable).insert([
    { conversation_id: created.id, user_id: actor.id, role: 'owner' },
    { conversation_id: created.id, user_id: otherId, role: 'member' },
  ])
  const row = await loadConversation(String(created.id))
  return buildConversation(row, actor.id)
}

/** Creates a named group with the chosen staff members. */
export async function createGroup(
  actor: ChatActor,
  title: string,
  memberIds: string[],
): Promise<ChatConversation> {
  const trimmed = String(title ?? '').trim()
  if (!trimmed) {
    throw new ApiError(400, 'The group needs a name.')
  }
  if (trimmed.length > MAX_CHAT_TITLE_LENGTH) {
    throw new ApiError(400, `Group names are limited to ${MAX_CHAT_TITLE_LENGTH} characters.`)
  }

  const uniqueIds = [...new Set(memberIds.map((id) => String(id)))].filter((id) => id !== actor.id)
  if (uniqueIds.length === 0) {
    throw new ApiError(400, 'Choose at least one staff member to add to the group.')
  }
  if (uniqueIds.length > MAX_GROUP_MEMBERS) {
    throw new ApiError(400, `Groups can hold up to ${MAX_GROUP_MEMBERS} staff members.`)
  }
  for (const id of uniqueIds) {
    assertUuid(id, 'member')
  }
  await assertActiveUsers(uniqueIds)

  const db = getDb()
  const { data: created, error } = await db
    .from(chatConversationsTable)
    .insert({ type: 'group', title: trimmed, direct_key: null, created_by: actor.id })
    .select('id')
    .single()
  if (error || !created) {
    throw new ApiError(500, 'Could not create the group.')
  }

  await db.from(chatParticipantsTable).insert([
    { conversation_id: created.id, user_id: actor.id, role: 'owner' },
    ...uniqueIds.map((userId) => ({ conversation_id: created.id, user_id: userId, role: 'member' as const })),
  ])
  const row = await loadConversation(String(created.id))
  return buildConversation(row, actor.id)
}

// ---------------------------------------------------------------------------
// Sending, editing, deleting
// ---------------------------------------------------------------------------

/** Validates the attachment a client wants to send with a message. */
function normalizeAttachment(value: unknown): ChatAttachment | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'object') {
    throw new ApiError(400, 'That attachment could not be verified.')
  }
  const candidate = value as Partial<ChatAttachment>
  const url = typeof candidate.url === 'string' ? candidate.url : ''
  const name = typeof candidate.name === 'string' ? candidate.name.slice(0, 255) : ''
  const mime = typeof candidate.mime === 'string' ? candidate.mime.slice(0, 128) : ''
  const size = typeof candidate.size === 'number' && candidate.size >= 0 ? candidate.size : 0
  if (!url || !isStoredChatAttachmentUrl(url)) {
    throw new ApiError(400, 'That attachment could not be verified.')
  }
  if (size > MAX_CHAT_FILE_SIZE_BYTES) {
    throw new ApiError(413, 'That file is too large. Please choose a file up to 10 MB.')
  }
  return { url, name: name || 'attachment', mime: mime || 'application/octet-stream', size }
}

/** Persists a new message in a conversation the sender belongs to. */
export async function sendMessage(
  actor: ChatActor,
  conversationId: string,
  payload: { body?: unknown; attachment?: unknown },
): Promise<ChatMessage> {
  await assertMember(conversationId, actor.id)

  const body = String(payload.body ?? '').trim()
  if (body.length > MAX_CHAT_BODY_LENGTH) {
    throw new ApiError(400, `Messages are limited to ${MAX_CHAT_BODY_LENGTH} characters.`)
  }
  const attachment = normalizeAttachment(payload.attachment)
  if (!attachment && !body) {
    throw new ApiError(400, 'Write a message or attach a file.')
  }

  const kind: ChatMessageKind = attachment
    ? attachment.mime.startsWith('image/')
      ? 'image'
      : 'file'
    : 'text'

  const { data, error } = await getDb()
    .from(chatMessagesTable)
    .insert({
      conversation_id: conversationId,
      sender_id: actor.id,
      body,
      kind,
      attachment_url: attachment?.url ?? '',
      attachment_name: attachment?.name ?? '',
      attachment_mime: attachment?.mime ?? '',
      attachment_size: attachment?.size ?? 0,
    })
    .select(CHAT_MESSAGE_SELECT)
    .single()
  if (error || !data) {
    throw new ApiError(500, 'Could not send the message.')
  }

  // Keeps the conversation list ordered by newest activity.
  await getDb()
    .from(chatConversationsTable)
    .update({ last_message_at: data.created_at })
    .eq('id', conversationId)

  return toChatMessage(data as ChatMessageWithSenderRow)
}

/** Edits the sender's own message body (captions included). */
export async function editMessage(actor: ChatActor, messageId: string, body: string): Promise<ChatMessage> {
  const db = getDb()
  const { data: existing, error: loadError } = await db
    .from(chatMessagesTable)
    .select('*')
    .eq('id', messageId)
    .maybeSingle()
  if (loadError || !existing) {
    throw new ApiError(404, 'Message not found.')
  }
  const row = existing as { sender_id: string; deleted_at: string | null }
  if (row.sender_id !== actor.id) {
    throw new ApiError(403, 'You can only edit your own messages.')
  }
  if (row.deleted_at) {
    throw new ApiError(400, 'That message has been deleted.')
  }

  const trimmed = String(body ?? '').trim()
  if (!trimmed) {
    throw new ApiError(400, 'A message cannot be empty.')
  }
  if (trimmed.length > MAX_CHAT_BODY_LENGTH) {
    throw new ApiError(400, `Messages are limited to ${MAX_CHAT_BODY_LENGTH} characters.`)
  }

  const { data: updated, error } = await db
    .from(chatMessagesTable)
    .update({ body: trimmed, edited_at: new Date().toISOString() })
    .eq('id', messageId)
    .select(CHAT_MESSAGE_SELECT)
    .single()
  if (error || !updated) {
    throw new ApiError(500, 'Could not update the message.')
  }
  return toChatMessage(updated as ChatMessageWithSenderRow)
}

/**
 * Soft-deletes the sender's own message: the row stays so the room still sees
 * "This message was deleted", but its content and file are cleared.
 */
export async function deleteMessage(actor: ChatActor, messageId: string): Promise<ChatMessage> {
  const db = getDb()
  const { data: existing, error: loadError } = await db
    .from(chatMessagesTable)
    .select('*')
    .eq('id', messageId)
    .maybeSingle()
  if (loadError || !existing) {
    throw new ApiError(404, 'Message not found.')
  }
  const row = existing as { sender_id: string; deleted_at: string | null; attachment_url: string }
  if (row.sender_id !== actor.id) {
    throw new ApiError(403, 'You can only delete your own messages.')
  }
  if (row.deleted_at) {
    return toChatMessage({ ...(existing as ChatMessageWithSenderRow) })
  }

  const { data: updated, error } = await db
    .from(chatMessagesTable)
    .update({
      body: '',
      deleted_at: new Date().toISOString(),
      attachment_url: '',
      attachment_name: '',
      attachment_mime: '',
      attachment_size: 0,
    })
    .eq('id', messageId)
    .select(CHAT_MESSAGE_SELECT)
    .single()
  if (error || !updated) {
    throw new ApiError(500, 'Could not delete the message.')
  }

  if (row.attachment_url) {
    void deleteStoredChatAttachment(row.attachment_url)
  }
  return toChatMessage(updated as ChatMessageWithSenderRow)
}

// ---------------------------------------------------------------------------
// Managing conversations
// ---------------------------------------------------------------------------

/** Renames a group conversation. */
export async function renameConversation(
  actor: ChatActor,
  conversationId: string,
  title: string,
): Promise<ChatConversation> {
  const row = await loadConversation(conversationId)
  assertCanManage(actor, row)
  if (row.type !== 'group') {
    throw new ApiError(400, 'Direct conversations cannot be renamed.')
  }
  const trimmed = String(title ?? '').trim()
  if (!trimmed) {
    throw new ApiError(400, 'The group needs a name.')
  }
  if (trimmed.length > MAX_CHAT_TITLE_LENGTH) {
    throw new ApiError(400, `Group names are limited to ${MAX_CHAT_TITLE_LENGTH} characters.`)
  }

  const { data, error } = await getDb()
    .from(chatConversationsTable)
    .update({ title: trimmed })
    .eq('id', conversationId)
    .select(CHAT_CONVERSATION_SELECT)
    .single()
  if (error || !data) {
    throw new ApiError(500, 'Could not rename the group.')
  }
  return buildConversation(data as ChatConversationWithParticipantsRow, actor.id)
}

/** Adds staff members to a group; returns who was actually added. */
export async function addParticipants(
  actor: ChatActor,
  conversationId: string,
  memberIds: string[],
): Promise<{ conversation: ChatConversation; addedIds: string[] }> {
  const row = await loadConversation(conversationId)
  if (row.type !== 'group') {
    throw new ApiError(400, 'Members can only be added to group conversations.')
  }
  assertCanManage(actor, row)

  const existing = new Set((row.participants ?? []).map((participant) => participant.user_id))
  const uniqueIds = [...new Set(memberIds.map((id) => String(id)))].filter((id) => !existing.has(id))
  if (uniqueIds.length === 0) {
    return { conversation: await buildConversation(row, actor.id), addedIds: [] }
  }
  if (uniqueIds.length > MAX_GROUP_MEMBERS) {
    throw new ApiError(400, `Groups can hold up to ${MAX_GROUP_MEMBERS} staff members.`)
  }
  for (const id of uniqueIds) {
    assertUuid(id, 'member')
  }
  await assertActiveUsers(uniqueIds)

  const { data: inserted, error } = await getDb()
    .from(chatParticipantsTable)
    .upsert(
      uniqueIds.map((userId) => ({ conversation_id: conversationId, user_id: userId, role: 'member' })),
      { onConflict: 'conversation_id,user_id', ignoreDuplicates: true },
    )
    .select('user_id')
  if (error) {
    throw new ApiError(500, 'Could not add the selected staff members.')
  }

  const addedIds = (inserted ?? []).map((item) => String(item.user_id))
  const refreshed = await loadConversation(conversationId)
  return { conversation: await buildConversation(refreshed, actor.id), addedIds }
}

/**
 * Removes a person from a group: members may remove themselves (leave), while
 * removing anyone else is reserved for the group owner and administrators.
 * Direct conversations cannot be left — they belong to both people.
 */
export async function removeParticipant(
  actor: ChatActor,
  conversationId: string,
  targetUserId: string,
): Promise<{ removedUserId: string; remainingIds: string[] }> {
  const row = await loadConversation(conversationId)
  if (row.type !== 'group') {
    throw new ApiError(400, 'Direct conversations cannot be left.')
  }

  const isSelf = targetUserId === actor.id
  const target = (row.participants ?? []).find((participant) => participant.user_id === targetUserId)
  if (!target) {
    if (isSelf) {
      throw new ApiError(400, 'You are not a member of this conversation.')
    }
    throw new ApiError(400, 'That staff member is not in this conversation.')
  }

  if (!isSelf) {
    const isOwner = (row.participants ?? []).some(
      (participant) => participant.user_id === actor.id && participant.role === 'owner',
    )
    if (!isOwner && actor.role !== 'admin') {
      throw new ApiError(403, 'Only the group owner or an administrator can remove members.')
    }
  } else {
    assertCanManage(actor, row)
  }

  const { error } = await getDb()
    .from(chatParticipantsTable)
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', targetUserId)
  if (error) {
    throw new ApiError(500, 'Could not update the conversation.')
  }

  const remainingIds = (row.participants ?? [])
    .map((participant) => participant.user_id)
    .filter((id) => id !== targetUserId)
  return { removedUserId: targetUserId, remainingIds }
}

/** Marks a conversation read for one person; returns the new read timestamp. */
export async function markConversationRead(conversationId: string, userId: string): Promise<string> {
  await assertMember(conversationId, userId)
  const lastReadAt = new Date().toISOString()
  const { error } = await getDb()
    .from(chatParticipantsTable)
    .update({ last_read_at: lastReadAt })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
  if (error) {
    throw new ApiError(500, 'Could not update the conversation.')
  }
  return lastReadAt
}
