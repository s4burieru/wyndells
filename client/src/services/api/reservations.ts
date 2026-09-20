import { apiQuery, apiRequest } from '@/services/api/client'
import type { Reservation, ReservationListResult, ReservationStatus, TimeSlot } from '@/types'

export async function createReservation(payload: Record<string, unknown>): Promise<Reservation> {
  const data = await apiRequest<{ reservation: Reservation }>('/api/reservations', {
    method: 'POST',
    body: payload,
    auth: false,
  })
  return data.reservation
}

export async function fetchTimeSlots(branch: string, date: string, guests: number): Promise<TimeSlot[]> {
  const data = await apiRequest<{ slots: TimeSlot[] }>(
    apiQuery('/api/reservations/slots', { branch, date, guests }),
    { auth: false },
  )
  return data.slots
}

export async function verifyReservation(reference: string, contactNumber: string): Promise<Reservation> {
  const data = await apiRequest<{ reservation: Reservation }>('/api/reservations/verify', {
    method: 'POST',
    body: { reference, contactNumber },
    auth: false,
  })
  return data.reservation
}

export async function cancelReservation(reference: string, contactNumber: string): Promise<Reservation> {
  const data = await apiRequest<{ reservation: Reservation }>(`/api/reservations/${reference}/cancel`, {
    method: 'POST',
    body: { contactNumber },
    auth: false,
  })
  return data.reservation
}

export async function fetchReservations(options: {
  branch?: string
  status?: ReservationStatus
  date?: string
  limit?: number
  skip?: number
} = {}): Promise<ReservationListResult> {
  const data = await apiRequest<ReservationListResult>(
    apiQuery('/api/reservations', {
      branch: options.branch,
      status: options.status,
      date: options.date,
      limit: options.limit,
      skip: options.skip,
    }),
  )
  return data
}

export async function updateReservationStatus(
  id: string,
  status: ReservationStatus,
  note = '',
): Promise<Reservation> {
  const data = await apiRequest<{ reservation: Reservation }>(`/api/reservations/${id}/status`, {
    method: 'PATCH',
    body: { status, note },
  })
  return data.reservation
}

export async function assignTableToReservation(id: string, tableId: string): Promise<Reservation> {
  const data = await apiRequest<{ reservation: Reservation }>(`/api/reservations/${id}/table`, {
    method: 'PATCH',
    body: { tableId },
  })
  return data.reservation
}