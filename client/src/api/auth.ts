import { apiRequest } from '../lib/api'
import type {  SafeUser  } from '../lib/types'

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