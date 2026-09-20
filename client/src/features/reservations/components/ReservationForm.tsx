import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck, CircleAlert, Clock3, Loader2, UserRound } from 'lucide-react'
import type { Branch, TimeSlot } from '@/types'
import { formatDate, formatTime12, todayLocal } from '@/utils/format'
import { Field, TextArea, TextInput } from '@/components/common/FormControls'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState, PageHeader } from '@/components/common/PageHeader'

export type ReservationFormValues = {
  branch: string
  date: string
  time: string
  guests: string
  customerName: string
  email: string
  contactNumber: string
  specialRequests: string
}

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
  form: ReservationFormValues
  slots: TimeSlot[]
  loadingBranches: boolean
  loadingSlots: boolean
  slotError: string
  submitting: boolean
  error: string
  onUpdate: (field: keyof ReservationFormValues, value: string) => void
  onSubmit: () => void
}) {
  return (
    <div className="container-wyndell py-10">
      <PageHeader
        title="Book a reservation"
        subtitle="No account needed — reserve in under a minute and we'll give you a reference to save."
      />

      {error ? (
        <Alert variant="destructive" className="mt-4">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarCheck className="size-5 text-wyndell-orange-dark" aria-hidden />
              <CardTitle className="text-wyndell-forest">1 · When and where</CardTitle>
            </div>
            <CardDescription>Choose a branch, date, party size, then a time.</CardDescription>
          </CardHeader>
          <CardContent>
          <div className="grid gap-4">
          {loadingBranches ? (
            <div className="grid gap-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : null}
          {!loadingBranches && branches.length === 0 ? (
            <ErrorState message="No branches are available for online reservations right now." />
          ) : (
            <div className="grid gap-4">
              <Field label="Branch">
                <Select value={form.branch || undefined} onValueChange={(value) => onUpdate('branch', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a branch…" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch._id} value={branch._id}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <Select value={form.guests} onValueChange={(value) => onUpdate('guests', value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Guests" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 20 }, (_, index) => String(index + 1)).map((value) => (
                        <SelectItem key={value} value={value}>{value}{value === '1' ? ' guest' : ' guests'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>
          )}
          {form.branch ? <SlotPicker form={form} slots={slots} loading={loadingSlots} error={slotError} onUpdate={onUpdate} /> : null}
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserRound className="size-5 text-wyndell-orange-dark" aria-hidden />
              <CardTitle className="text-wyndell-forest">2 · Your details</CardTitle>
            </div>
            <CardDescription>We use this only to confirm your table.</CardDescription>
          </CardHeader>
          <CardContent>
          <div className="grid gap-4">
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
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="link" asChild className="h-auto p-0 text-xs text-wyndell-orange-dark">
                <Link to="/check">
                  Already booked? Check your reservation
                  <ArrowRight />
                </Link>
              </Button>
              <Button onClick={onSubmit} disabled={submitting} className="bg-wyndell-orange text-white hover:bg-wyndell-orange-dark">
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit reservation'
                )}
              </Button>
            </div>
          </div>
          </CardContent>
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
  form: ReservationFormValues
  slots: TimeSlot[]
  loading: boolean
  error: string
  onUpdate: (field: keyof ReservationFormValues, value: string) => void
}) {
  return (
    <div className="grid gap-2" role="group" aria-label="Available times">
      <span className="inline-flex items-center gap-1.5 text-sm font-medium">
        <Clock3 className="size-4 text-wyndell-orange-dark" aria-hidden />
        Available times · {form.date ? formatDate(form.date) : 'pick a date first'}
      </span>
      {loading ? (
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-9 w-24" />
          ))}
        </div>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {!loading && !error && slots.length === 0 && form.date ? (
        <p className="text-sm text-muted-foreground">No tables available for this date and group size. Try another day or time.</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {slots.map((slot) => (
          <Button
            key={slot.time}
            type="button"
            variant={form.time === slot.time ? 'default' : 'outline'}
            onClick={() => onUpdate('time', slot.time)}
            className={form.time === slot.time ? 'bg-wyndell-orange text-white hover:bg-wyndell-orange-dark' : undefined}
          >
            {formatTime12(slot.time)}
            <Badge variant="secondary" className="bg-muted text-muted-foreground">{slot.availableSpots}</Badge>
          </Button>
        ))}
      </div>
    </div>
  )
}