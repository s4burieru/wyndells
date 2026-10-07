import { apiQuery, apiRequest } from '@/services/api/client'
import type { Promotion } from '@/types'

/** Public listing for the home page — published rows inside their window. */
export async function fetchPublicPromotions(limit?: number): Promise<Promotion[]> {
  const data = await apiRequest<{ promotions: Promotion[] }>(
    apiQuery('/api/promotions', { limit }),
    { auth: false },
  )
  return data.promotions
}

/** Staff listing — drafts included; managers only ever see their own branch. */
export async function fetchManageablePromotions(branch?: string): Promise<Promotion[]> {
  const data = await apiRequest<{ promotions: Promotion[] }>(
    apiQuery('/api/promotions/manage', { branch }),
  )
  return data.promotions
}

/**
 * Saves a promotion. Payloads are sent as `FormData` so the optional card
 * photo travels with the rest of the fields (the API also accepts JSON when
 * there is no file).
 */
export async function createPromotion(payload: FormData | Record<string, unknown>): Promise<Promotion> {
  const data = await apiRequest<{ promotion: Promotion }>('/api/promotions', {
    method: 'POST',
    body: payload,
  })
  return data.promotion
}

export async function updatePromotion(
  id: string,
  payload: FormData | Record<string, unknown>,
): Promise<Promotion> {
  const data = await apiRequest<{ promotion: Promotion }>(`/api/promotions/${id}`, {
    method: 'PUT',
    body: payload,
  })
  return data.promotion
}

export async function deletePromotion(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`/api/promotions/${id}`, { method: 'DELETE' })
}
