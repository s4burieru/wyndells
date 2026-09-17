import { useEffect, useState, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import type {  Reservation  } from '../../lib/types'
import { formatDate, formatTime12 } from '../../lib/format'
import { downloadReservationReceipt } from '../../lib/receipt'

export function ReservationConfirmationPage({
  reservation,
  autoDownloadedRef,
}: {
  reservation: Reservation
  autoDownloadedRef?: RefObject<string | null>
}) {
  const [autoDownloaded, setAutoDownloaded] = useState(
    () => autoDownloadedRef?.current === reservation.reference,
  )

  // Fallback: if the automatic download during submit was blocked/skipped
  // (e.g. the user gesture expired while the request was in flight),
  // try once more when the confirmation screen mounts.
  useEffect(() => {
    if (autoDownloadedRef?.current === reservation.reference) {
      return
    }
    try {
      downloadReservationReceipt(reservation)
      if (autoDownloadedRef) {
        autoDownloadedRef.current = reservation.reference
      }
      setAutoDownloaded(true)
    } catch {
      setAutoDownloaded(false)
    }
    // Run once per reservation reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservation.reference])

  const handleDownload = () => {
    downloadReservationReceipt(reservation)
    setAutoDownloaded(true)
    if (autoDownloadedRef) {
      autoDownloadedRef.current = reservation.reference
    }
  }
  return (
    <div className="container-wyndell py-12">
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl border-2 border-wyndell-green bg-white p-8 text-center shadow-md">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-wyndell-green/15 text-3xl" aria-hidden>
            ✓
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-wyndell-forest">Reservation submitted successfully</h1>
          <p className="mt-2 text-sm text-neutral-600">
            {autoDownloaded
              ? 'Your receipt has been downloaded automatically — it includes your reservation reference.'
              : 'Please save your reservation reference. You’ll need it to check your reservation status.'}
          </p>

          <div className="mx-auto mt-6 rounded-2xl border border-dashed border-wyndell-orange/40 bg-wyndell-cream px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Reservation reference</p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-wide text-wyndell-orange-dark">{reservation.reference}</p>
            <button
              type="button"
              onClick={handleDownload}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-wyndell-forest px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <span aria-hidden>⬇</span> {autoDownloaded ? 'Download receipt again' : 'Download receipt'}
            </button>
            <p className="mt-2 text-[11px] text-neutral-500">
              Receipt file: Wyndells-Reservation-{reservation.reference}.pdf
            </p>
          </div>

          <dl className="mt-8 grid gap-2 text-sm">
            <Row label="Name" value={reservation.customerName} />
            <Row label="Branch" value={reservation.branch?.name ?? '—'} />
            <Row label="Date" value={formatDate(reservation.date)} />
            <Row label="Time" value={formatTime12(reservation.time)} />
            <Row label="Guests" value={String(reservation.guests)} />
            {reservation.specialRequests ? <Row label="Requests" value={reservation.specialRequests} /> : null}
            <Row label="Status" value="Pending — awaiting confirmation" />
          </dl>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/check" className="rounded-lg bg-wyndell-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-wyndell-orange-dark">
              Check reservation status
            </Link>
            <Link to="/menu" className="rounded-lg border border-wyndell-green-dark/30 px-5 py-2.5 text-sm font-semibold text-wyndell-green-dark hover:bg-wyndell-green/10">
              Browse the menu
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-wyndell-cream-dark/70 py-1.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="font-medium text-wyndell-ink">{value}</dd>
    </div>
  )
}