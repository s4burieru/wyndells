import { apiQuery, apiRequest } from '@/services/api/client'
import type {  Overview  } from '@/types'

export async function fetchOverview(): Promise<Overview> {
  const data = await apiRequest<{ overview: Overview }>('/api/reports/overview')
  return data.overview
}

export async function fetchOverviewForBranch(branchId: string): Promise<Overview> {
  // The manager overview ignores branch params (scope is the assigned branch);
  // this helper exists for admin pages that may reload at a branch level.
  const data = await apiRequest<{ overview: Overview }>(
    apiQuery('/api/reports/overview', { branch: branchId }),
  )
  return data.overview
}