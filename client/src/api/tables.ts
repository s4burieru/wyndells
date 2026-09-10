import { apiQuery, apiRequest } from '../lib/api'
import { type DiningTable } from '../lib/types'

export async function fetchTables(options: { branch?: string } = {}): Promise<DiningTable[]> {
  const data = await apiRequest<{ tables: DiningTable[] }>(apiQuery('/api/tables', { branch: options.branch }))
  return data.tables
}

export async function createTable(payload: Record<string, unknown>): Promise<DiningTable> {
  const data = await apiRequest<{ table: DiningTable }>('/api/tables', { method: 'POST', body: payload })
  return data.table
}

export async function updateTable(id: string, payload: Record<string, unknown>): Promise<DiningTable> {
  const data = await apiRequest<{ table: DiningTable }>(`/api/tables/${id}`, {
    method: 'PUT',
    body: payload,
  })
  return data.table
}

export async function setTableStatus(id: string, status: string): Promise<DiningTable> {
  const data = await apiRequest<{ table: DiningTable }>(`/api/tables/${id}/status`, {
    method: 'PATCH',
    body: { status },
  })
  return data.table
}