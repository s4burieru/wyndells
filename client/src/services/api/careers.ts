import { apiQuery, apiRequest } from '@/services/api/client'
import type { ApplicationStatus, CareerPosting, JobApplication, ManageableCareerPosting } from '@/types'

export async function fetchCareers(branch?: string): Promise<CareerPosting[]> {
  const data = await apiRequest<{ postings: CareerPosting[] }>(
    apiQuery('/api/careers/postings', { branch }),
    { auth: false },
  )
  return data.postings
}

export async function submitApplication(payload: Record<string, unknown> | FormData): Promise<JobApplication> {
  const data = await apiRequest<{ application: JobApplication }>('/api/careers/applications', {
    method: 'POST',
    body: payload,
    auth: false,
  })
  return data.application
}

export async function fetchManageablePostings(): Promise<ManageableCareerPosting[]> {
  const data = await apiRequest<{ postings: ManageableCareerPosting[] }>('/api/careers/postings/manage')
  return data.postings
}

export async function createPosting(payload: Record<string, unknown>): Promise<ManageableCareerPosting> {
  const data = await apiRequest<{ posting: ManageableCareerPosting }>('/api/careers/postings', {
    method: 'POST',
    body: payload,
  })
  return data.posting
}

export async function updatePosting(id: string, payload: Record<string, unknown>): Promise<ManageableCareerPosting> {
  const data = await apiRequest<{ posting: ManageableCareerPosting }>(`/api/careers/postings/${id}`, {
    method: 'PUT',
    body: payload,
  })
  return data.posting
}

export async function deletePosting(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`/api/careers/postings/${id}`, { method: 'DELETE' })
}

export async function fetchApplications(): Promise<JobApplication[]> {
  const data = await apiRequest<{ applications: JobApplication[] }>('/api/careers/applications')
  return data.applications
}

export async function setApplicationStatus(id: string, status: ApplicationStatus): Promise<JobApplication> {
  const data = await apiRequest<{ application: JobApplication }>(`/api/careers/applications/${id}/status`, {
    method: 'PATCH',
    body: { status },
  })
  return data.application
}

export async function deleteApplication(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`/api/careers/applications/${id}`, { method: 'DELETE' })
}