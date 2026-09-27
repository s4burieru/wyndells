import { apiQuery, apiRequest } from '@/services/api/client'
import type {
  ChatAttachment,
  ChatConversation,
  ChatMessagesResult,
  ChatUnreadSummary,
  ChatUserRef,
} from '@/types'

/** Conversations for the signed-in staff member, most recent first. */
export async function fetchChatConversations(): Promise<{ conversations: ChatConversation[] }> {
  return apiRequest('/api/chat/conversations')
}

/** Starts (or finds) the direct conversation with one staff member. */
export async function createDirectConversation(userId: string): Promise<ChatConversation> {
  const data = await apiRequest<{ conversation: ChatConversation }>('/api/chat/conversations', {
    method: 'POST',
    body: { type: 'direct', userId },
  })
  return data.conversation
}

/** Creates a group conversation with the chosen staff members. */
export async function createGroupConversation(
  title: string,
  memberIds: string[],
): Promise<ChatConversation> {
  const data = await apiRequest<{ conversation: ChatConversation }>('/api/chat/conversations', {
    method: 'POST',
    body: { type: 'group', title, memberIds },
  })
  return data.conversation
}

/** Paged history for one conversation; pass the oldest loaded timestamp as `before`. */
export async function fetchChatMessages(
  conversationId: string,
  before?: string,
  limit = 50,
): Promise<ChatMessagesResult> {
  return apiRequest(
    apiQuery(`/api/chat/conversations/${conversationId}/messages`, { before, limit }),
  )
}

export async function renameConversation(
  conversationId: string,
  title: string,
): Promise<ChatConversation> {
  const data = await apiRequest<{ conversation: ChatConversation }>(
    `/api/chat/conversations/${conversationId}`,
    { method: 'PATCH', body: { title } },
  )
  return data.conversation
}

/** Uploads a new photo for a group (any member of the conversation). */
export async function updateGroupImage(
  conversationId: string,
  file: File,
): Promise<ChatConversation> {
  const form = new FormData()
  form.append('image', file)
  const data = await apiRequest<{ conversation: ChatConversation }>(
    `/api/chat/conversations/${conversationId}/image`,
    { method: 'PATCH', body: form },
  )
  return data.conversation
}

/** Removes the group photo; members fall back to the initials avatar. */
export async function removeGroupImage(conversationId: string): Promise<ChatConversation> {
  const data = await apiRequest<{ conversation: ChatConversation }>(
    `/api/chat/conversations/${conversationId}/image`,
    { method: 'DELETE' },
  )
  return data.conversation
}

/** Deletes a conversation for the signed-in staff member only. */
export async function deleteConversation(conversationId: string): Promise<void> {
  await apiRequest(`/api/chat/conversations/${conversationId}`, { method: 'DELETE' })
}

/** Promotes a member to group admin, or demotes them back to a plain member. */
export async function setConversationMemberRole(
  conversationId: string,
  userId: string,
  role: 'admin' | 'member',
): Promise<ChatConversation> {
  const data = await apiRequest<{ conversation: ChatConversation }>(
    `/api/chat/conversations/${conversationId}/participants/${userId}/role`,
    { method: 'PATCH', body: { role } },
  )
  return data.conversation
}

export async function addConversationMembers(
  conversationId: string,
  memberIds: string[],
): Promise<ChatConversation> {
  const data = await apiRequest<{ conversation: ChatConversation }>(
    `/api/chat/conversations/${conversationId}/participants`,
    { method: 'POST', body: { memberIds } },
  )
  return data.conversation
}

/** Removes a member, or leaves the group when `userId` is `'me'`. */
export async function removeConversationMember(
  conversationId: string,
  userId: string,
): Promise<void> {
  await apiRequest(`/api/chat/conversations/${conversationId}/participants/${userId}`, {
    method: 'DELETE',
  })
}

/** Marks a conversation read for the signed-in staff member. */
export async function markConversationRead(conversationId: string): Promise<void> {
  await apiRequest(`/api/chat/conversations/${conversationId}/read`, { method: 'POST' })
}

/** Unread totals for the sidebar badge and live refreshes. */
export async function fetchChatUnreadSummary(): Promise<ChatUnreadSummary> {
  return apiRequest('/api/chat/unread-count')
}

/** Staff directory for the new-chat pickers (everyone except yourself). */
export async function fetchChatDirectory(): Promise<{ users: ChatUserRef[] }> {
  return apiRequest('/api/chat/directory')
}

/** Uploads an attachment before it is referenced by a message. */
export async function uploadChatAttachment(file: File): Promise<ChatAttachment> {
  const form = new FormData()
  form.append('file', file)
  const data = await apiRequest<{ attachment: ChatAttachment }>('/api/chat/uploads', {
    method: 'POST',
    body: form,
  })
  return data.attachment
}
