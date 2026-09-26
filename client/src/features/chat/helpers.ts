import type { ChatConversation, ChatMessage, ChatParticipant } from '@/types'

/** Everyone in the conversation except the current user. */
export function otherParticipants(
  conversation: ChatConversation,
  currentUserId: string,
): ChatParticipant[] {
  return conversation.participants.filter((participant) => participant.id !== currentUserId)
}

/** The one other person in a direct conversation (undefined when alone). */
export function directPartner(
  conversation: ChatConversation,
  currentUserId: string,
): ChatParticipant | undefined {
  return otherParticipants(conversation, currentUserId)[0]
}

/** Display title: the other person for direct chats, the name for groups. */
export function conversationTitle(conversation: ChatConversation, currentUserId: string): string {
  if (conversation.type === 'group') {
    return conversation.title.trim() || 'Untitled group'
  }
  return directPartner(conversation, currentUserId)?.name ?? 'Conversation'
}

/** Subtitle shown under the title: member names, or the person's role. */
export function conversationSubtitle(
  conversation: ChatConversation,
  currentUserId: string,
  roleLabel: (role: 'admin' | 'manager') => string,
): string {
  if (conversation.type === 'group') {
    const count = conversation.participants.length
    return `${count} ${count === 1 ? 'member' : 'members'}`
  }
  const partner = directPartner(conversation, currentUserId)
  return partner ? roleLabel(partner.role) : ''
}

/** One-line list preview for a conversation's newest message. */
export function messagePreview(message: ChatMessage | null): string {
  if (!message) return 'No messages yet'
  if (message.deletedAt) return 'This message was deleted'
  const text = message.body.trim()
  if (message.attachment) {
    const label = message.attachment.mime.startsWith('image/')
      ? 'Photo'
      : message.attachment.name
    return text ? `${label} · ${text}` : label
  }
  return text
}

/** People who have opened the conversation since `message` arrived. */
export function seenByParticipants(
  conversation: ChatConversation,
  message: ChatMessage,
  currentUserId: string,
): ChatParticipant[] {
  const messageTime = new Date(message.createdAt).getTime()
  return conversation.participants.filter(
    (participant) =>
      participant.id !== currentUserId &&
      new Date(participant.lastReadAt).getTime() >= messageTime,
  )
}

/** Short clock label used under each message, e.g. "3:04 PM". */
export function messageTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
}

/** Day label for the separators between message groups. */
export function dayLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const startOfMessage = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const days = Math.round((startOfToday - startOfMessage) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Same calendar day, used to group consecutive messages. */
export function isSameDay(a: string, b: string): boolean {
  const left = new Date(a)
  const right = new Date(b)
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return false
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

/** True when two messages belong to the same sender run within 5 minutes. */
export function isGroupedWith(previous: ChatMessage | undefined, message: ChatMessage): boolean {
  if (!previous) return false
  if (previous.sender.id !== message.sender.id) return false
  if (previous.deletedAt || message.deletedAt) return false
  const gap = new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime()
  return gap <= 5 * 60_000
}

/** Human-friendly file size for attachment cards. */
export function fileSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let value = size
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const rounded = value >= 10 || Number.isInteger(value) ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${units[unitIndex]}`
}
