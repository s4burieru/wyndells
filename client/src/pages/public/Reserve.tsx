import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchBranches } from '../../api/branches'
import { createReservation, fetchTimeSlots } from '../../api/reservations'
import type {  Branch, Reservation, TimeSlot  } from '../../lib/types'
import { friendlyError } from '../../lib/format'
import { ReservationForm } from './ReservationForm'
import { ReservationConfirmationPage } from './ReservationConfirmation'

export type ReservationFormData = {
  branch: string
  date: string
  time: string
  guests: string
  customerName: string
  email: string
  contactNumber: string
  specialRequests: string
}

const EMPTY_FORM: ReservationFormData = {
  branch: '',
  date: '',
  time: '',
  guests: '2',
  customerName: '',
  email: '',
  contactNumber: '',
  specialRequests: '',
}

export function ReservePage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [form, setForm] = useState<ReservationFormData>({ ...EMPTY_FORM })
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingBranches, setLoadingBranches] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState<Reservation | null>(null)
  const [error, setError] = useState('')
  const [slotError, setSlotError] = useState('')
  const [searchParams] = useSearchParams()

  useEffect(() => {
    void fetchBranches()
      .then((branchList) => {
        setBranches(branchList)
        const fromQuery = searchParams.get('branch')
        if (fromQuery && branchList.some((branch) => branch._id === fromQuery)) {
          setForm((current) => ({ ...current, branch: fromQuery }))
        }
      })
      .catch(() => setError('Unable to load branches. Please try again.'))
      .finally(() => setLoadingBranches(false))
  }, [searchParams])

  const update = (field: keyof ReservationFormData, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  useEffect(() => {
    const { branch, date, guests } = form
    if (!branch || !date || !guests) {
      setSlots([])
      return
    }
    setLoadingSlots(true)
    setSlotError('')
    void fetchTimeSlots(branch, date, Number(guests))
      .then((available) => {
        setSlots(available)
        if (form.time && !available.some((slot) => slot.time === form.time)) {
          update('time', '')
        }
      })
      .catch((reason: unknown) => {
        setSlots([])
        setSlotError(friendlyError(reason, 'No availability for that combination.'))
      })
      .finally(() => setLoadingSlots(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.branch, form.date, form.guests])

  const ready =
    form.branch && form.date && form.time && form.guests && form.customerName && form.email && form.contactNumber

  const submit = async () => {
    if (!ready) {
      setError('Please fill in all the highlighted fields.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const reservation = await createReservation({
        branch: form.branch,
        date: form.date,
        time: form.time,
        guests: Number(form.guests),
        customerName: form.customerName,
        email: form.email,
        contactNumber: form.contactNumber,
        specialRequests: form.specialRequests,
      })
      setConfirmation(reservation)
    } catch (reason: unknown) {
      setError(friendlyError(reason))
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmation) {
    return <ReservationConfirmationPage reservation={confirmation} />
  }

  return (
    <ReservationForm
      branches={branches}
      form={form}
      slots={slots}
      loadingBranches={loadingBranches}
      loadingSlots={loadingSlots}
      slotError={slotError}
      submitting={submitting}
      error={error}
      onUpdate={update}
      onSubmit={() => void submit()}
    />
  )
}