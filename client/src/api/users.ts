import { apiRequest } from '../lib/api'
import type {  SafeUser  } from '../lib/types'

export async function fetchUsers(): Promise<SafeUser[]> {
  const data = await apiRequest<{ users: SafeUser[] }>('/api/users')
  return data.users
}

export async function createUser(payload: Record<string, unknown>): Promise<SafeUser> {
  const data = await apiRequest<{ user: SafeUser }>('/api/users', { method: 'POST', body: payload })
  return data.user
}

export async function updateUser(id: string, payload: Record<string, unknown>): Promise<SafeUser> {
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