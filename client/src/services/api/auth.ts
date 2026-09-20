import { apiRequest } from '../lib/api'
import type { SafeUser } from '../lib/types'

export type LoginResult = { token: string; user: SafeUser }

export async function login(email: string, password: string): Promise<LoginResult> {
  return apiRequest<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
}

export async function fetchMe(): Promise<SafeUser> {
  const result = await apiRequest<{ user: SafeUser }>('/api/auth/me')
  return result.user
}

/**
 * Lets the signed-in staff member save their own profile details. Send JSON for
 * text fields, or `multipart/form-data` with an `avatar` file to upload a photo
 * (an empty `avatarUrl` field removes the stored one).
 */
export async function updateProfile(
  payload: Record<string, unknown> | FormData,
): Promise<SafeUser> {
  const result = await apiRequest<{ user: SafeUser }>('/api/auth/me', {
    method: 'PATCH',
    body: payload,
  })
  return result.user
}