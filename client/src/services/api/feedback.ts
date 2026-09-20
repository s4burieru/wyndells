import { apiQuery, apiRequest } from '@/services/api/client'
import type {  Feedback, FeedbackSummary  } from '@/types'

export async function fetchPublicFeedback(branch?: string): Promise<FeedbackSummary[]> {
  const data = await apiRequest<{ feedback: FeedbackSummary[] }>(
    apiQuery('/api/feedback', { branch }),
    { auth: false },
  )
  return data.feedback
}

export async function submitFeedback(payload: Record<string, unknown>): Promise<FeedbackSummary> {
  const data = await apiRequest<{ feedback: FeedbackSummary }>('/api/feedback', {
    method: 'POST',
    body: payload,
    auth: false,
  })
  return data.feedback
}

export async function fetchManageableFeedback(): Promise<Feedback[]> {
  const data = await apiRequest<{ feedback: Feedback[] }>('/api/feedback/manage')
  return data.feedback
}

export async function deleteFeedback(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`/api/feedback/${id}`, { method: 'DELETE' })
}