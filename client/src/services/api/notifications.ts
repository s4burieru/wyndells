import { apiQuery, apiRequest } from '@/services/api/client'
import type { AppNotification, NotificationListResult } from '@/types'

/** Latest notifications for the signed-in staff member, newest first. */
export async function fetchNotifications(limit = 30): Promise<NotificationListResult> {
  return apiRequest<NotificationListResult>(apiQuery('/api/notifications', { limit }))
}

/** Fast path polled for the bell badge. */
export async function fetchUnreadCount(): Promise<number> {
  const data = await apiRequest<{ unread: number }>('/api/notifications/unread-count')
  return data.unread
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  const data = await apiRequest<{ notification: AppNotification }>(
    `/api/notifications/${id}/read`,
    { method: 'PATCH' },
  )
  return data.notification
}

export async function markNotificationUnread(id: string): Promise<AppNotification> {
  const data = await apiRequest<{ notification: AppNotification }>(
    `/api/notifications/${id}/unread`,
    { method: 'PATCH' },
  )
  return data.notification
}

/** Clears the badge in one request; returns how many rows changed. */
export async function markAllNotificationsRead(): Promise<number> {
  const data = await apiRequest<{ updated: number }>('/api/notifications/read-all', {
    method: 'POST',
  })
  return data.updated
}

export async function deleteNotification(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`/api/notifications/${id}`, { method: 'DELETE' })
}

/** Removes every notification for the signed-in user; returns how many were removed. */
export async function clearAllNotifications(): Promise<number> {
  const data = await apiRequest<{ deleted: number }>('/api/notifications', { method: 'DELETE' })
  return data.deleted
}
