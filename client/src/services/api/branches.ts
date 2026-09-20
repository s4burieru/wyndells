import { apiQuery, apiRequest } from '@/services/api/client'
import type {  Branch  } from '@/types'

export async function fetchBranches(includeInactive = false): Promise<Branch[]> {
  const data = await apiRequest<{ branches: Branch[] }>(apiQuery('/api/branches', { includeInactive }))
  return data.branches
}

export async function fetchBranch(codeOrId: string): Promise<Branch> {
  const data = await apiRequest<{ branch: Branch }>(`/api/branches/${encodeURIComponent(codeOrId)}`)
  return data.branch
}

export async function createBranch(payload: Record<string, unknown>): Promise<Branch> {
  const data = await apiRequest<{ branch: Branch }>('/api/branches', {
    method: 'POST',
    body: payload,
  })
  return data.branch
}

export async function updateBranch(id: string, payload: Record<string, unknown>): Promise<Branch> {
  const data = await apiRequest<{ branch: Branch }>(`/api/branches/${id}`, {
    method: 'PUT',
    body: payload,
  })
  return data.branch
}

export async function setBranchActive(id: string, isActive: boolean): Promise<Branch> {
  const data = await apiRequest<{ branch: Branch }>(`/api/branches/${id}/status`, {
    method: 'PATCH',
    body: { isActive },
  })
  return data.branch
}