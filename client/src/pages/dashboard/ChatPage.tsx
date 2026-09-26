import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/utils/cn'
import { friendlyError } from '@/utils/format'
import { useAuth } from '@/contexts/AuthContext'
import { ConfirmDialog } from '@/components/common/Modal'
import { EmptyState, PageHeader } from '@/components/common/PageHeader'
import {
  ChatHeader,
  Composer,
  ConversationList,
  DirectChatModal,
  GroupChatModal,
  GroupSettingsModal,
  MessageList,
  type TypingMap,
} from '@/features/chat/components'
import {
  addConversationMembers,
  createDirectConversation,
  createGroupConversation,
  fetchChatConversations,
  fetchChatMessages,
  markConversationRead,
  removeConversationMember,
  renameConversation,
} from '@/services/api/chat'
import {
  connectChatSocket,
  deleteChatMessage,
  editChatMessage,
  getChatSocket,
  sendChatMessage,
} from '@/services/chatSocket'
import type { ChatAttachment, ChatConversation, ChatMessage } from '@/types'

/** Replaces a conversation in place, keeping the locally tracked unread count. */
function mergeConversation(
  conversations: ChatConversation[],
  incoming: ChatConversation,
): ChatConversation[] {
  const index = conversations.findIndex((item) => item._id === incoming._id)
  if (index === -1) return conversations
  const existing = conversations[index]
  const incomingNewer =
    incoming.lastMessage &&
    (!existing.lastMessage ||
      new Date(incoming.lastMessage.createdAt).getTime() >
        new Date(existing.lastMessage.createdAt).getTime())
  const merged: ChatConversation = {
    ...existing,
    ...incoming,
    // Broadcasts are metadata refreshes — only the REST list owns unread counts.
    unread: existing.unread,
    lastMessage: incomingNewer ? incoming.lastMessage : existing.lastMessage,
  }
  const next = [...conversations]
  next[index] = merged
  return next
}

/**
 * Staff chat: a two-pane messenger (conversation list + thread) kept live by
 * one shared Socket.io connection. The page owns all state; the feature
 * components under `features/chat` are presentational.
 */
export function ChatPage() {
  const { user } = useAuth()
  const userId = user?.id ?? ''

  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [olderLoading, setOlderLoading] = useState(false)

  const [typingMap, setTypingMap] = useState<TypingMap>({})
  const [search, setSearch] = useState('')
  const [directOpen, setDirectOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)

  /** Mirrors `activeId` for socket handlers, which must not re-subscribe. */
  const activeIdRef = useRef<string | null>(null)
  /** Invalidates in-flight message loads when the reader switches threads. */
  const loadTokenRef = useRef(0)

  const activeConversation = conversations.find((item) => item._id === activeId) ?? null

  // -------------------------------------------------------------------------
  // Conversation list
  // -------------------------------------------------------------------------

  const loadConversations = useCallback(() => {
    setListLoading(true)
    setListError(null)
    fetchChatConversations()
      .then((result) => setConversations(result.conversations))
      .catch((reason: unknown) => setListError(friendlyError(reason)))
      .finally(() => setListLoading(false))
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // -------------------------------------------------------------------------
  // Live events — registered once per signed-in user, reading fresh state
  // through refs and functional updates so a new message never re-subscribes.
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!user) return
    connectChatSocket()
    const socket = getChatSocket()

    const handleMessageNew = (message: ChatMessage) => {
      const isActive = message.conversationId === activeIdRef.current
      const mine = message.sender.id === userId
      const markRead = isActive && !mine && !document.hidden

      if (isActive) {
        setMessages((prev) =>
          prev.some((item) => item._id === message._id) ? prev : [...prev, message],
        )
        if (markRead) {
          void markConversationRead(message.conversationId).catch(() => undefined)
        }
      }

      setConversations((prev) => {
        const index = prev.findIndex((item) => item._id === message.conversationId)
        if (index === -1) return prev
        const existing = prev[index]
        const updated: ChatConversation = {
          ...existing,
          lastMessage: message,
          unread: mine || markRead ? 0 : existing.unread + 1,
        }
        return [updated, ...prev.filter((item) => item._id !== existing._id)]
      })
    }

    const handleMessageUpdated = (message: ChatMessage) => {
      setMessages((prev) => prev.map((item) => (item._id === message._id ? message : item)))
      setConversations((prev) =>
        prev.map((item) =>
          item.lastMessage?._id === message._id ? { ...item, lastMessage: message } : item,
        ),
      )
    }

    const handleConversationCreated = (conversation: ChatConversation) => {
      setConversations((prev) =>
        prev.some((item) => item._id === conversation._id)
          ? mergeConversation(prev, conversation)
          : [{ ...conversation, unread: 0 }, ...prev],
      )
    }

    const handleConversationUpdated = (conversation: ChatConversation) => {
      setConversations((prev) => mergeConversation(prev, conversation))
    }

    const handleConversationRemoved = (payload: { conversationId: string }) => {
      setConversations((prev) => prev.filter((item) => item._id !== payload.conversationId))
      if (activeIdRef.current === payload.conversationId) {
        activeIdRef.current = null
        loadTokenRef.current += 1
        setActiveId(null)
        setMessages([])
        setMessagesError(null)
        setHasMore(false)
        setTypingMap({})
        setSettingsOpen(false)
        setLeaveConfirmOpen(false)
      }
    }

    const handleParticipantRemoved = (payload: {
      conversationId: string
      userId: string
    }) => {
      setConversations((prev) =>
        prev.map((item) =>
          item._id === payload.conversationId
            ? {
                ...item,
                participants: item.participants.filter((person) => person.id !== payload.userId),
              }
            : item,
        ),
      )
    }

    const handleReadUpdated = (payload: {
      conversationId: string
      userId: string
      lastReadAt: string
    }) => {
      setConversations((prev) =>
        prev.map((item) => {
          if (item._id !== payload.conversationId) return item
          return {
            ...item,
            unread: payload.userId === userId ? 0 : item.unread,
            participants: item.participants.map((person) =>
              person.id === payload.userId ? { ...person, lastReadAt: payload.lastReadAt } : person,
            ),
          }
        }),
      )
    }

    const handleTyping = (payload: {
      conversationId: string
      userId: string
      name: string
      isTyping: boolean
    }) => {
      if (payload.userId === userId) return
      setTypingMap((prev) => {
        const next = { ...prev }
        if (payload.isTyping) {
          next[payload.conversationId] = { name: payload.name, expires: Date.now() + 4000 }
        } else {
          delete next[payload.conversationId]
        }
        return next
      })
    }

    socket.on('message:new', handleMessageNew)
    socket.on('message:updated', handleMessageUpdated)
    socket.on('message:deleted', handleMessageUpdated)
    socket.on('conversation:created', handleConversationCreated)
    socket.on('conversation:updated', handleConversationUpdated)
    socket.on('conversation:removed', handleConversationRemoved)
    socket.on('participant:removed', handleParticipantRemoved)
    socket.on('read:updated', handleReadUpdated)
    socket.on('typing', handleTyping)
    // Missed events while offline are healed by a fresh list on reconnect.
    socket.io.on('reconnect', loadConversations)

    return () => {
      socket.off('message:new', handleMessageNew)
      socket.off('message:updated', handleMessageUpdated)
      socket.off('message:deleted', handleMessageUpdated)
      socket.off('conversation:created', handleConversationCreated)
      socket.off('conversation:updated', handleConversationUpdated)
      socket.off('conversation:removed', handleConversationRemoved)
      socket.off('participant:removed', handleParticipantRemoved)
      socket.off('read:updated', handleReadUpdated)
      socket.off('typing', handleTyping)
      socket.io.off('reconnect', loadConversations)
    }
  }, [user, userId, loadConversations])

  // Expires stale "…is typing" indicators.
  useEffect(() => {
    const timer = setInterval(() => {
      setTypingMap((prev) => {
        const now = Date.now()
        const alive = Object.entries(prev).filter(([, value]) => value.expires > now)
        if (alive.length === Object.keys(prev).length) return prev
        return Object.fromEntries(alive)
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // -------------------------------------------------------------------------
  // Opening threads & paging history
  // -------------------------------------------------------------------------

  const openConversation = useCallback((conversationId: string) => {
    const token = ++loadTokenRef.current
    activeIdRef.current = conversationId
    setActiveId(conversationId)
    setMessages([])
    setMessagesError(null)
    setHasMore(false)
    setOlderLoading(false)
    setMessagesLoading(true)
    setConversations((prev) =>
      prev.map((item) => (item._id === conversationId ? { ...item, unread: 0 } : item)),
    )

    fetchChatMessages(conversationId)
      .then((result) => {
        if (token !== loadTokenRef.current) return
        setMessages(result.messages)
        setHasMore(result.hasMore)
      })
      .catch((reason: unknown) => {
        if (token !== loadTokenRef.current) return
        setMessagesError(friendlyError(reason))
      })
      .finally(() => {
        if (token === loadTokenRef.current) setMessagesLoading(false)
      })

    // Best-effort: the read receipt travels to the room via the server.
    void markConversationRead(conversationId).catch(() => undefined)
  }, [])

  const loadOlderMessages = useCallback(() => {
    const conversationId = activeIdRef.current
    if (!conversationId || !hasMore || olderLoading || messages.length === 0) return
    const token = loadTokenRef.current
    const before = messages[0].createdAt
    setOlderLoading(true)
    fetchChatMessages(conversationId, before)
      .then((result) => {
        if (token !== loadTokenRef.current) return
        setMessages((prev) => [...result.messages, ...prev])
        setHasMore(result.hasMore)
      })
      .catch(() => {
        // Paging is retried on the next scroll; stay quiet here.
      })
      .finally(() => {
        if (token === loadTokenRef.current) setOlderLoading(false)
      })
  }, [hasMore, olderLoading, messages])

  // -------------------------------------------------------------------------
  // Sending / editing / deleting — errors are toasted by the leaf component,
  // which keeps the composer text or edit draft intact for a retry.
  // -------------------------------------------------------------------------

  const handleSend = async (body: string, attachment: ChatAttachment | null) => {
    const conversationId = activeIdRef.current
    if (!conversationId) return
    await sendChatMessage({ conversationId, body: body || undefined, attachment })
  }

  const handleEditMessage = async (messageId: string, body: string) => {
    const message = await editChatMessage(messageId, body)
    setMessages((prev) => prev.map((item) => (item._id === messageId ? message : item)))
    setConversations((prev) =>
      prev.map((item) =>
        item.lastMessage?._id === messageId ? { ...item, lastMessage: message } : item,
      ),
    )
  }

  const handleDeleteMessage = async (messageId: string) => {
    const message = await deleteChatMessage(messageId)
    setMessages((prev) => prev.map((item) => (item._id === messageId ? message : item)))
    setConversations((prev) =>
      prev.map((item) =>
        item.lastMessage?._id === messageId ? { ...item, lastMessage: message } : item,
      ),
    )
  }

  // -------------------------------------------------------------------------
  // Creating & managing conversations — callers toast failures, and only
  // close their dialog when these resolve.
  // -------------------------------------------------------------------------

  const handleStartDirect = async (otherUserId: string) => {
    const conversation = await createDirectConversation(otherUserId)
    setConversations((prev) =>
      prev.some((item) => item._id === conversation._id)
        ? mergeConversation(prev, conversation)
        : [{ ...conversation, unread: 0 }, ...prev],
    )
    setDirectOpen(false)
    openConversation(conversation._id)
  }

  const handleCreateGroup = async (title: string, memberIds: string[]) => {
    const conversation = await createGroupConversation(title, memberIds)
    setConversations((prev) =>
      prev.some((item) => item._id === conversation._id)
        ? mergeConversation(prev, conversation)
        : [{ ...conversation, unread: 0 }, ...prev],
    )
    setGroupOpen(false)
    openConversation(conversation._id)
  }

  const handleRenameGroup = async (title: string) => {
    const conversationId = activeIdRef.current
    if (!conversationId) return
    const updated = await renameConversation(conversationId, title)
    setConversations((prev) => mergeConversation(prev, updated))
    toast.success('Group renamed.')
  }

  const handleAddMembers = async (memberIds: string[]) => {
    const conversationId = activeIdRef.current
    if (!conversationId) return
    const updated = await addConversationMembers(conversationId, memberIds)
    setConversations((prev) => mergeConversation(prev, updated))
    toast.success(memberIds.length === 1 ? 'Member added.' : `${memberIds.length} members added.`)
  }

  const closeActiveConversation = useCallback((conversationId: string) => {
    setConversations((prev) => prev.filter((item) => item._id !== conversationId))
    if (activeIdRef.current === conversationId) {
      activeIdRef.current = null
      loadTokenRef.current += 1
      setActiveId(null)
      setMessages([])
      setMessagesError(null)
      setHasMore(false)
      setTypingMap({})
      setSettingsOpen(false)
      setLeaveConfirmOpen(false)
    }
  }, [])

  const handleRemoveMember = async (memberUserId: string) => {
    const conversationId = activeIdRef.current
    if (!conversationId) return
    await removeConversationMember(conversationId, memberUserId)
    // The `participant:removed` broadcast lands too; this covers a dropped socket.
    setConversations((prev) =>
      prev.map((item) =>
        item._id === conversationId
          ? { ...item, participants: item.participants.filter((person) => person.id !== memberUserId) }
          : item,
      ),
    )
  }

  const handleLeaveGroup = async () => {
    const conversationId = activeIdRef.current
    if (!conversationId) return
    await removeConversationMember(conversationId, 'me')
    closeActiveConversation(conversationId)
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const activeTyping = activeId ? typingMap[activeId] : undefined
  const typingNames = activeTyping ? [activeTyping.name] : []

  if (!user) return null

  return (
    <div>
      <PageHeader
        title="Chat"
        subtitle="Message your fellow staff members directly or in groups."
      />

      <div className="mt-6 grid h-[calc(100dvh-10rem)] min-h-96 grid-cols-1 overflow-hidden rounded-xl border bg-card md:grid-cols-[320px_1fr]">
        <aside
          className={cn('min-h-0 border-r md:flex md:flex-col', activeId ? 'hidden' : 'flex')}
        >
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            currentUserId={userId}
            search={search}
            typing={typingMap}
            loading={listLoading}
            error={listError}
            onSearchChange={setSearch}
            onSelect={openConversation}
            onNewDirect={() => setDirectOpen(true)}
            onNewGroup={() => setGroupOpen(true)}
            onRetry={loadConversations}
          />
        </aside>

        <section
          className={cn('min-h-0 flex-col', activeId ? 'flex' : 'hidden md:flex')}
          aria-label="Conversation"
        >
          {activeConversation ? (
            <>
              <ChatHeader
                conversation={activeConversation}
                currentUserId={userId}
                onBack={() => {
                  activeIdRef.current = null
                  loadTokenRef.current += 1
                  setActiveId(null)
                  setMessages([])
                  setHasMore(false)
                }}
                onOpenSettings={() => setSettingsOpen(true)}
                onLeave={() => setLeaveConfirmOpen(true)}
              />
              <MessageList
                conversation={activeConversation}
                messages={messages}
                currentUserId={userId}
                loading={messagesLoading}
                error={messagesError}
                hasMore={hasMore}
                loadingOlder={olderLoading}
                typingNames={typingNames}
                onLoadOlder={loadOlderMessages}
                onRetry={() => openConversation(activeConversation._id)}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
              />
              <Composer
                key={activeConversation._id}
                conversationId={activeConversation._id}
                onSend={handleSend}
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                title="Select a conversation"
                message="Pick a conversation from the list, or start a new message to reach your fellow staff members."
                action={
                  <button
                    type="button"
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    onClick={() => setDirectOpen(true)}
                  >
                    Start a new message
                  </button>
                }
              />
            </div>
          )}
        </section>
      </div>

      <DirectChatModal
        open={directOpen}
        onClose={() => setDirectOpen(false)}
        onStart={handleStartDirect}
      />
      <GroupChatModal
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        onCreate={handleCreateGroup}
      />
      <GroupSettingsModal
        open={settingsOpen && activeConversation !== null}
        conversation={activeConversation}
        currentUserId={userId}
        currentUserRole={user.role}
        onClose={() => setSettingsOpen(false)}
        onRename={handleRenameGroup}
        onAdd={handleAddMembers}
        onRemove={handleRemoveMember}
        onLeave={handleLeaveGroup}
      />
      <ConfirmDialog
        open={leaveConfirmOpen}
        title="Leave group?"
        message="You will stop receiving messages from this group. A group owner can add you back later."
        confirmLabel="Leave"
        onConfirm={() => {
          void handleLeaveGroup().catch((reason: unknown) =>
            toast.error(friendlyError(reason)),
          )
        }}
        onCancel={() => setLeaveConfirmOpen(false)}
      />
    </div>
  )
}
