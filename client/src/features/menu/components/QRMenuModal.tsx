import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { fetchBranches } from '@/services/api/branches'
import type { Branch } from '@/types'
import { Button } from '@/components/common/FormControls'
import { Spinner } from '@/components/common/PageHeader'
import { Modal } from '@/components/common/Modal'

/**
 * Shows (and prints) a scannable QR code that opens the public digital menu
 * for one branch. Managers are locked to their assigned branch; admins can
 * pick any branch.
 */
export function QRMenuModal({
  defaultBranchId,
  onClose,
}: {
  defaultBranchId: string
  onClose: () => void
}) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchId, setBranchId] = useState(defaultBranchId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetchBranches()
      .then((list) => {
        setBranches(list)
        setBranchId((current) => (current && list.some((item) => item._id === current) ? current : list[0]?._id ?? ''))
      })
      .catch(() => setError('Unable to load branches.'))
      .finally(() => setLoading(false))
  }, [])

  const branch = branches.find((item) => item._id === branchId)
  const menuUrl = branchId ? `${window.location.origin}/menu?branch=${branchId}` : ''

  return (
    <Modal
      open
      title="QR digital menu"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="secondary" onClick={() => window.print()} disabled={!branchId}>
            Print QR
          </Button>
        </>
      }
    >
      {loading ? (
        <Spinner label="Loading branches…" />
      ) : error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : branches.length === 0 ? (
        <p className="text-sm text-neutral-500">Add a branch first — the QR points at a branch menu.</p>
      ) : (
        <div className="grid gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-wyndell-ink">Branch</span>
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              className="w-full rounded-lg border border-wyndell-ink/20 bg-white px-3 py-2 text-sm focus:border-wyndell-orange focus:outline-none"
            >
              {branches.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          {branch && menuUrl ? (
            <div
              id="qr-print-card"
              className="mx-auto flex flex-col items-center rounded-2xl border border-wyndell-cream-dark bg-white p-6 text-center"
            >
              <QRCodeSVG value={menuUrl} size={192} level="M" fgColor="#1f2a22" bgColor="#ffffff" />
              <h4 className="mt-4 font-display text-lg font-bold text-wyndell-forest">{branch.name}</h4>
              <p className="mt-1 text-xs text-neutral-500">
                Scan to view the Wyndell&rsquo;s digital menu — no app or account needed.
              </p>
              <p className="mt-2 max-w-56 break-all text-[11px] text-neutral-400">{menuUrl}</p>
            </div>
          ) : null}

          <p className="text-xs text-neutral-500">
            Print this card and place it on tables or at the entrance. Guests scan it to browse the
            menu and can book a reservation straight from the same page.
          </p>
        </div>
      )}
    </Modal>
  )
}