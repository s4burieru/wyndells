import { apiRequest } from '@/services/api/client'
import type { SafeUser } from '@/types'

/** JSON for profile fields, or `multipart/form-data` when a photo is attached. */
type UserPayload = Record<string, unknown> | FormData

export async function fetchUsers(): Promise<SafeUser[]> {
  const data = await apiRequest<{ users: SafeUser[] }>('/api/users')
  return data.users
}

/**
 * Staff directory listing — unlike `fetchUsers` above (admin-only), this is
 * available to every signed-in staff member for browsing work profiles.
 */
export async function fetchStaff(): Promise<SafeUser[]> {
  const data = await apiRequest<{ users: SafeUser[] }>('/api/staff')
  return data.users
}

/** A single staff member's profile, loaded by id for the profile page. */
export async function fetchStaffProfile(id: string): Promise<SafeUser> {
  const data = await apiRequest<{ user: SafeUser }>(`/api/staff/${encodeURIComponent(id)}`)
  return data.user
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

export async function deleteUser(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`/api/users/${id}`, { method: 'DELETE' })
}
