import { apiRequest } from '@/services/api/client'
import type { SafeUser } from '@/types'

export type LoginResult = { token: string; user: SafeUser }

export async function login(email: string, password: string): Promise<LoginResult> {
  return apiRequest<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
}

/**
 * Trades a verified Google identity for a portal session. The API checks the
 * token with Supabase Auth and only signs in people who already have an active
 * account — an unknown Google email is refused, never registered.
 */
export async function loginWithGoogle(accessToken: string): Promise<LoginResult> {
  return apiRequest<LoginResult>('/api/auth/google', {
    method: 'POST',
    body: { accessToken },
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