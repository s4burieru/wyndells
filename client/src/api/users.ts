import { apiRequest } from '../lib/api'
import type { SafeUser } from '../lib/types'

/** JSON for profile fields, or `multipart/form-data` when a photo is attached. */
type UserPayload = Record<string, unknown> | FormData

export async function fetchUsers(): Promise<SafeUser[]> {
  const data = await apiRequest<{ users: SafeUser[] }>('/api/users')
  return data.users
}

export async function createUser(payload: UserPayload): Promise<SafeUser> {
  const data = await apiRequest<{ user: SafeUser }>('/api/users', { method: 'POST', body: payload })
  return data.user
}

export async function updateUser(id: string, payload: UserPayload): Promise<SafeUser> {
  const data = await apiRequest<{ user: SafeUser }>(`/api/users/${id}`, {
    method: 'PUT',
    body: payload,
  })
  return data.user
}

export async function setUserActive(id: string, isActive: boolean): Promise<SafeUser> {
  const data = await apiRequest<{ user: SafeUser }>(`/api/users/${id}/status`, {
    method: 'PATCH',
    body: { isActive },
  })
  return data.user
}