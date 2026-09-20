export class ApiError extends Error {
  readonly statusCode: number
  readonly details?: string[]

  constructor(statusCode: number, message: string, details?: string[]) {
    super(message)
    this.statusCode = statusCode
    this.details = details
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, unknown> | FormData
  auth?: boolean
}

const TOKEN_KEY = 'wyndells_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

/**
 * Central fetch wrapper. Attaches the stored JWT on authenticated requests,
 * parses JSON, and converts failed responses into ApiError with a friendly
 * message so pages never see raw server errors.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (options.auth !== false) {
    const token = getToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  let response: Response
  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body
        ? options.body instanceof FormData
          ? options.body
          : JSON.stringify(options.body)
        : undefined,
    })
  } catch {
    throw new ApiError(0, 'Unable to reach the server. Please check your connection.')
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : 'Something went wrong. Please try again.'
    const details =
      payload && typeof payload === 'object' && 'details' in payload
        ? (payload as { details: unknown }).details
        : undefined
    throw new ApiError(response.status, message, Array.isArray(details) ? details.map(String) : undefined)
  }

  return payload as T
}

export function apiQuery(
  path: string,
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  }
  const query = search.toString()
  return query ? `${path}?${query}` : path
}