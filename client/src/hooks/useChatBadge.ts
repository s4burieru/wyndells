import { useEffect, useState } from 'react'
import { getToken } from '@/services/api/client'
import { fetchChatUnreadSummary } from '@/services/api/chat'
import { connectChatSocket, disconnectChatSocket, getChatSocket } from '@/services/chatSocket'

/** How long live refreshes are coalesced before hitting the API. */
const REFRESH_DEBOUNCE_MS = 500

/**
 * Total unread chat messages for the sidebar badge.
 *
 * Keeps one shared socket connection open for the whole dashboard, refreshes
 * the count once on mount, then again (debounced) whenever the socket reports
 * something that could change it, on window focus, and after reconnects —
 * so the number self-heals instead of drifting. Stops entirely when there is
 * no signed-in session.
 */
export function useChatBadge(enabled: boolean): number {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!enabled || !getToken()) return

    connectChatSocket()
    const socket = getChatSocket()
    let timer: ReturnType<typeof setTimeout> | null = null

    const refresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void fetchChatUnreadSummary()
          .then((summary) => setUnread(summary.total))
          .catch(() => {
            // A dropped refresh is invisible; the next event or focus retries.
          })
      }, REFRESH_DEBOUNCE_MS)
    }

    void fetchChatUnreadSummary()
      .then((summary) => setUnread(summary.total))
      .catch(() => undefined)

    socket.on('message:new', refresh)
    socket.on('conversation:created', refresh)
    socket.on('conversation:removed', refresh)
    socket.on('read:updated', refresh)
    socket.io.on('reconnect', refresh)
    window.addEventListener('focus', refresh)

    return () => {
      if (timer) clearTimeout(timer)
      socket.off('message:new', refresh)
      socket.off('conversation:created', refresh)
      socket.off('conversation:removed', refresh)
      socket.off('read:updated', refresh)
      socket.io.off('reconnect', refresh)
      window.removeEventListener('focus', refresh)
      disconnectChatSocket()
    }
  }, [enabled])

  return unread
}
