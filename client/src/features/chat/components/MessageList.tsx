import { Fragment, useEffect, useRef } from 'react'
import { ErrorState, Spinner } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import type { ChatConversation, ChatMessage } from '@/types'
import { dayLabel, isGroupedWith, isSameDay, seenByParticipants } from '../helpers'
import { MessageBubble } from './MessageBubble'

/** Scrollable message history with day separators, paging, and receipts. */
export function MessageList({
  conversation,
  messages,
  currentUserId,
  loading,
  error,
  hasMore,
  loadingOlder,
  typingNames,
  onLoadOlder,
  onRetry,
  onEdit,
  onDelete,
}: {
  conversation: ChatConversation
  messages: ChatMessage[]
  currentUserId: string
  loading: boolean
  error: string | null
  hasMore: boolean
  loadingOlder: boolean
  typingNames: string[]
  onLoadOlder: () => void
  onRetry: () => void
  onEdit: (messageId: string, body: string) => Promise<void>
  onDelete: (messageId: string) => Promise<void>
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  /** Follow new messages only while the reader is already at the bottom. */
  const stickToBottomRef = useRef(true)
  const previousFirstIdRef = useRef<string | null>(null)
  /** Container height captured just before older messages are prepended. */
  const heightBeforeOlderRef = useRef(0)

  const handleScroll = () => {
    const element = scrollRef.current
    if (!element) return
    stickToBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120
    if (element.scrollTop < 80) {
      onLoadOlder()
    }
  }

  // Switching conversations always starts pinned to the newest message.
  useEffect(() => {
    stickToBottomRef.current = true
    previousFirstIdRef.current = null
    heightBeforeOlderRef.current = 0
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [conversation._id])

  // Remember the height right after the older page is requested…
  useEffect(() => {
    if (loadingOlder) {
      heightBeforeOlderRef.current = scrollRef.current?.scrollHeight ?? 0
    }
  }, [loadingOlder])

  // …then shift the scroll position so the view stays anchored on prepend.
  useEffect(() => {
    const element = scrollRef.current
    const firstId = messages[0]?._id ?? null
    if (
      element &&
      previousFirstIdRef.current !== null &&
      heightBeforeOlderRef.current > 0 &&
      firstId !== previousFirstIdRef.current
    ) {
      element.scrollTop += element.scrollHeight - heightBeforeOlderRef.current
      heightBeforeOlderRef.current = 0
    }
    previousFirstIdRef.current = firstId

    if (stickToBottomRef.current) {
      element?.scrollTo({ top: element.scrollHeight })
    }
  }, [messages])

  const lastMessage = messages[messages.length - 1]
  const receiptNames =
    lastMessage && lastMessage.sender.id === currentUserId && !lastMessage.deletedAt
      ? seenByParticipants(conversation, lastMessage, currentUserId).map((person) => person.name)
      : []
  const showReceipt = receiptNames.length > 0
  const receiptLabel =
    conversation.type === 'direct'
      ? 'Seen'
      : `Seen by ${receiptNames.slice(0, 3).join(', ')}${receiptNames.length > 3 ? ` +${receiptNames.length - 3}` : ''}`

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
      role="log"
      aria-label="Messages"
    >
      {loading ? (
        <Spinner label="Loading messages…" />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : (
        <>
          {hasMore ? (
            <div className="pb-3 text-center">
              <Button variant="ghost" size="sm" onClick={onLoadOlder} disabled={loadingOlder}>
                {loadingOlder ? 'Loading…' : 'Load earlier messages'}
              </Button>
            </div>
          ) : null}

          {messages.map((message, index) => {
            const previous = messages[index - 1]
            const newDay = !previous || !isSameDay(previous.createdAt, message.createdAt)
            const showSender =
              message.sender.id !== currentUserId && !isGroupedWith(previous, message)
            return (
              <Fragment key={message._id}>
                {newDay ? (
                  <div className="my-4 flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" aria-hidden />
                    <span className="text-[0.7rem] text-muted-foreground">
                      {dayLabel(message.createdAt)}
                    </span>
                    <span className="h-px flex-1 bg-border" aria-hidden />
                  </div>
                ) : null}
                <div className="py-0.5">
                  <MessageBubble
                    message={message}
                    isOwn={message.sender.id === currentUserId}
                    showSender={showSender}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </div>
              </Fragment>
            )
          })}

          {!loading && messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No messages yet. Say hello!
            </p>
          ) : null}

          {typingNames.length > 0 ? (
            <div className="flex items-center gap-2 px-1 pt-2 text-xs text-muted-foreground">
              <span className="flex items-end gap-0.5" aria-hidden>
                {[0, 120, 240].map((delay) => (
                  <span
                    key={delay}
                    className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
              <span className="truncate">
                {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…
              </span>
            </div>
          ) : null}

          {showReceipt ? (
            <div className="pt-1 text-right text-[0.65rem] text-muted-foreground">
              {receiptLabel}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
