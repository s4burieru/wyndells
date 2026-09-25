import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/api/notifications'
import { getToken } from '@/services/api/client'
import type { AppNotification } from '@/types'

/** How often the badge refreshes while the tab is in the foreground. */
const POLL_INTERVAL_MS = 30_000

type NotificationsState = {
  notifications: AppNotification[]
  unread: number
  loading: boolean
  error: string | null
}

/**
 * Keeps the header bell in sync: loads the list once, then refreshes the
 * unread count every 30 seconds. Polling pauses while the tab is hidden and
 * resumes (with an immediate refresh) when it comes back, and stops entirely
 * when there is no session — a signed-out visitor never polls.
 */
export function useNotifications(enabled: boolean) {
  const [state, setState] = useState<NotificationsState>({
    notifications: [],
    unread: 0,
    loading: false,
    error: null,
  })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadList = useCallback(async () => {
    if (!getToken()) return
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const result = await fetchNotifications()
      setState({
        notifications: result.notifications,
        unread: result.unread,
        loading: false,
        error: null,
      })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Could not load notifications.',
      }))
    }
  }, [])

  /** Badge-only refresh — cheap enough to run on every poll tick. */
  const refreshCount = useCallback(async () => {
    if (!getToken()) return
    try {
      const unread = await fetchUnreadCount()
      setState((prev) => (prev.unread === unread ? prev : { ...prev, unread }))
    } catch {
      // A dropped poll must not surface an error; the next tick retries.
    }
  }, [])

  const markRead = useCallback(async (id: string) => {
    if (!getToken()) return
    // Optimistic: the badge drops immediately, before the round trip lands.
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((item) =>
        item._id === id ? { ...item, isRead: true } : item,
      ),
      unread: Math.max(prev.unread - 1, 0),
    }))
    try {
      const updated = await markNotificationRead(id)
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((item) =>
          item._id === updated._id ? updated : item,
        ),
      }))
    } catch {
      await refreshCount()
    }
  }, [refreshCount])

  const markAllRead = useCallback(async () => {
    if (!getToken()) return
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((item) => ({ ...item, isRead: true })),
      unread: 0,
    }))
    try {
      await markAllNotificationsRead()
    } catch {
      await refreshCount()
    }
  }, [refreshCount])

  useEffect(() => {
    if (!enabled || !getToken()) return

    void loadList()

    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    const start = () => {
      stop()
      timerRef.current = setInterval(() => {
        if (document.hidden) return
        void refreshCount()
      }, POLL_INTERVAL_MS)
    }

    // Skip ticks in a background tab, then catch up the moment it is focused.
    const onVisibilityChange = () => {
      if (document.hidden) {
        stop()
      } else {
        start()
        void refreshCount()
      }
    }

    start()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, loadList, refreshCount])

  return {
    ...state,
    refresh: loadList,
    refreshCount,
    markRead,
    markAllRead,
  }
}
