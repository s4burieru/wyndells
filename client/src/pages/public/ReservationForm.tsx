import { Link } from 'react-router-dom'
import type {  Branch, TimeSlot  } from '../../lib/types'
import { formatDate, formatTime12, todayLocal } from '../../lib/format'
import { Button, Field, SelectInput, TextArea, TextInput } from '../../components/ui/controls'
import { Card, ErrorState, Spinner } from '../../components/ui/display'
import type { ReservationFormData } from './Reserve'

export function ReservationForm({
  branches,
  form,
  slots,
  loadingBranches,
  loadingSlots,
  slotError,
  submitting,
  error,
  onUpdate,
  onSubmit,
}: {
  branches: Branch[]
  form: ReservationFormData
  slots: TimeSlot[]
  loadingBranches: boolean
  loadingSlots: boolean
  slotError: string
  submitting: boolean
  error: string
  onUpdate: (field: keyof ReservationFormData, value: string) => void
  onSubmit: () => void
}) {
  return (
    <div className="container-wyndell py-10">
      <h1 className="font-display text-3xl font-bold text-wyndell-forest">Book a reservation</h1>
      <p className="mt-2 max-w-2xl text-wyndell-ink">
        No account needed — reserve in under a minute and we&rsquo;ll give you a reference to save.
      </p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-wyndell-forest">1 · When and where</h2>
          {loadingBranches ? <Spinner label="Loading branches…" /> : null}
          {!loadingBranches && branches.length === 0 ? (
            <ErrorState message="No branches are available for online reservations right now." />
          ) : (
            <div className="mt-4 grid gap-4">
              <Field label="Branch">
                <SelectInput value={form.branch} onChange={(event) => onUpdate('branch', event.target.value)}>
                  <option value="">Choose a branch…</option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>{branch.name}</option>
                  ))}
                </SelectInput>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Date">
                  <TextInput
                    type="date"
                    min={todayLocal()}
                    value={form.date}
                    onChange={(event) => onUpdate('date', event.target.value)}
                  />
                </Field>
                <Field label="Number of guests">
                  <SelectInput value={form.guests} onChange={(event) => onUpdate('guests', event.target.value)}>
                    {Array.from({ length: 20 }, (_, index) => String(index + 1)).map((value) => (
                      <option key={value} value={value}>{value}{value === '1' ? ' guest' : ' guests'}</option>
                    ))}
                  </SelectInput>
                </Field>
              </div>
            </div>
          )}
          {form.branch ? <SlotPicker form={form} slots={slots} loading={loadingSlots} error={slotError} onUpdate={onUpdate} /> : null}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-wyndell-forest">2 · Your details</h2>
          <div className="mt-4 grid gap-4">
            <Field label="Full name">
              <TextInput value={form.customerName} onChange={(event) => onUpdate('customerName', event.target.value)} placeholder="e.g. Maria Santos" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email">
                <TextInput type="email" value={form.email} onChange={(event) => onUpdate('email', event.target.value)} placeholder="you@example.com" />
              </Field>
              <Field label="Contact number">
                <TextInput value={form.contactNumber} onChange={(event) => onUpdate('contactNumber', event.target.value)} placeholder="09XX XXX XXXX" />
              </Field>
            </div>
            <Field label="Special requests (optional)">
              <TextArea value={form.specialRequests} onChange={(event) => onUpdate('specialRequests', event.target.value)} rows={3} placeholder="Window seat, birthday dessert, high chair…" />
            </Field>
            <div className="flex items-center justify-between gap-2">
              <Link to="/check" className="text-xs font-medium text-wyndell-orange-dark hover:underline">
                Already booked? Check your reservation
              </Link>
              <Button onClick={onSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit reservation'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function SlotPicker({
  form,
  slots,
  loading,
  error,
  onUpdate,
}: {
  form: ReservationFormData
  slots: TimeSlot[]
  loading: boolean
  error: string
  onUpdate: (field: keyof ReservationFormData, value: string) => void
}) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-wyndell-forest">
        Available times · {form.date ? formatDate(form.date) : 'pick a date first'}
      </h3>
      {loading ? <Spinner label="Checking availability…" /> : null}
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {!loading && !error && slots.length === 0 && form.date ? (
        <p className="mt-2 text-sm text-neutral-500">No tables available for this date and group size. Try another day or time.</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {slots.map((slot) => (
          <button
            key={slot.time}
            type="button"
            onClick={() => onUpdate('time', slot.time)}
            className={[
              'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
              form.time === slot.time
                ? 'bg-wyndell-orange text-white'
                : 'border border-wyndell-cream-dark bg-white text-wyndell-ink hover:bg-wyndell-cream-dark/60',
            ].join(' ')}
          >
            {formatTime12(slot.time)}
            <span className="ml-1 text-[10px] text-neutral-400">{slot.availableSpots}</span>
          </button>
        ))}
      </div>
    </div>
  )
}