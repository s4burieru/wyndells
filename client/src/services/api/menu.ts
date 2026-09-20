import { apiQuery, apiRequest } from '@/services/api/client'
import type {  MenuItem  } from '@/types'

export async function fetchMenuItems(options: {
  branch?: string
  category?: string
  featuredOnly?: boolean
  includeUnavailable?: boolean
  /** Staff screens set this so a deactivated branch's menu stays manageable. */
  includeInactiveBranches?: boolean
  limit?: number
} = {}): Promise<MenuItem[]> {
  const data = await apiRequest<{ items: MenuItem[] }>(
    apiQuery('/api/menu', {
      branch: options.branch,
      category: options.category,
      featured: options.featuredOnly,
      includeUnavailable: options.includeUnavailable,
      includeInactiveBranches: options.includeInactiveBranches,
      limit: options.limit,
    }),
  )
  return data.items
}

export async function createMenuItem(payload: Record<string, unknown>): Promise<MenuItem> {
  const data = await apiRequest<{ item: MenuItem }>('/api/menu', { method: 'POST', body: payload })
  return data.item
}

export async function updateMenuItem(id: string, payload: Record<string, unknown>): Promise<MenuItem> {
  const data = await apiRequest<{ item: MenuItem }>(`/api/menu/${id}`, {
    method: 'PUT',
    body: payload,
  })
  return data.item
}

export async function deleteMenuItem(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`/api/menu/${id}`, { method: 'DELETE' })
}