import { MessageSquarePlusIcon, UsersIcon } from 'lucide-react'
import { cn } from '@/utils/cn'
import { timeAgo } from '@/utils/format'
import { EmptyState, ErrorState } from '@/components/common/PageHeader'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { ChatConversation } from '@/types'
import { conversationTitle, directPartner, messagePreview } from '../helpers'

export type TypingMap = Record<string, { name: string; expires: number }>

/**
 * Left pane: search, "new message / new group" actions, and the conversation
 * list ordered by most recent activity with unread badges.
 */
export function ConversationList({
  conversations,
  activeId,
  currentUserId,
  search,
  typing,
  loading,
  error,
  onSearchChange,
  onSelect,
  onNewDirect,
  onNewGroup,
  onRetry,
}: {
  conversations: ChatConversation[]
  activeId: string | null
  currentUserId: string
  search: string
  typing: TypingMap
  loading: boolean
  error: string | null
  onSearchChange: (value: string) => void
  onSelect: (conversationId: string) => void
  onNewDirect: () => void
  onNewGroup: () => void
  onRetry: () => void
}) {
  const query = search.trim().toLowerCase()
  const visible = query
    ? conversations.filter((conversation) => {
        const title = conversationTitle(conversation, currentUserId).toLowerCase()
        const preview = messagePreview(conversation.lastMessage).toLowerCase()
        return title.includes(query) || preview.includes(query)
      })
    : conversations

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b p-3">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search conversations"
          aria-label="Search conversations"
          className="h-9"
        />
        <Button size="icon" variant="outline" onClick={onNewDirect} title="New message">
          <MessageSquarePlusIcon />
          <span className="sr-only">New message</span>
        </Button>
        <Button size="icon" variant="outline" onClick={onNewGroup} title="New group">
          <UsersIcon />
          <span className="sr-only">New group</span>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <div className="p-4">
            <ErrorState message={error} onRetry={onRetry} />
          </div>
        ) : loading ? (
          <div className="grid gap-4 p-4" role="status" aria-busy>
            <span className="sr-only">Loading conversations</span>
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="grid flex-1 gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={query ? 'No matching conversations' : 'No conversations yet'}
              message={
                query
                  ? 'Try a different name or message.'
                  : 'Start a direct message or create a group to reach your fellow staff members.'
              }
              action={
                query ? undefined : (
                  <Button onClick={onNewDirect}>
                    <MessageSquarePlusIcon />
                    New message
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <ul className="p-2">
            {visible.map((conversation) => {
              const partner = directPartner(conversation, currentUserId)
              const title = conversationTitle(conversation, currentUserId)
              const isActive = conversation._id === activeId
              const isTyping = Boolean(typing[conversation._id])
              const lastActivity =
                conversation.lastMessage?.createdAt ?? conversation.createdAt

              return (
                <li key={conversation._id}>
                  <button
                    type="button"
                    onClick={() => onSelect(conversation._id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      isActive ? 'bg-primary/10' : 'hover:bg-muted',
                    )}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <UserAvatar
                      name={title}
                      src={conversation.type === 'direct' ? partner?.avatarUrl : undefined}
                      role={partner?.role}
                      size="sm"
                    />
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">{title}</span>
                        <span className="shrink-0 text-[0.7rem] text-muted-foreground">
                          {timeAgo(lastActivity)}
                        </span>
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'truncate text-xs',
                            isTyping
                              ? 'italic text-primary'
                              : conversation.unread > 0
                                ? 'font-medium text-foreground'
                                : 'text-muted-foreground',
                          )}
                        >
                          {isTyping
                            ? `${typing[conversation._id]?.name ?? 'Someone'} is typing…`
                            : messagePreview(conversation.lastMessage)}
                        </span>
                        {conversation.unread > 0 ? (
                          <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[0.65rem] font-semibold text-primary-foreground">
                            {conversation.unread > 99 ? '99+' : conversation.unread}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
