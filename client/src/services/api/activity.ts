import { apiQuery, apiRequest } from '@/services/api/client'
import type { ActivityListResult } from '@/types'

export type ActivityQuery = {
  /** Action prefix, e.g. `reservation` — drives the page's filter tabs. */
  group?: string
  actor?: string
  branch?: string
  page?: number
}

/** Admin-only audit trail of who did what across the system. */
export async function fetchActivity(query: ActivityQuery = {}): Promise<ActivityListResult> {
  return apiRequest<ActivityListResult>(
    apiQuery('/api/activity', {
      group: query.group,
      actor: query.actor,
      branch: query.branch,
      page: query.page,
    }),
  )
}
