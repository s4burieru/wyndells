import { useEffect, useState } from 'react'
import { fetchBranches } from '@/services/api/branches'
import type { Branch } from '@/types'

/**
 * Branch dropdown shared by the management pages (Reservations, Tables, Menu,
 * Feedback, Careers). Reads and writes the `?branch=` URL param so the choice
 * persists across reloads and stays in sync with server-side filtering.
 */
export function BranchSelect({ value, onChange }: { value: string; onChange: (branchId: string) => void }) {
  const [branches, setBranches] = useState<Branch[]>([])

  useEffect(() => {
    void fetchBranches()
      .then(setBranches)
      .catch(() => setBranches([]))
  }, [])

  if (branches.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="branch-filter" className="text-sm font-medium text-muted-foreground">
        Branch
      </label>
      <select
        id="branch-filter"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
      >
        <option value="">All branches</option>
        {branches.map((branch) => (
          <option key={branch._id} value={branch._id}>
            {branch.name}
          </option>
        ))}
      </select>
    </div>
  )
}
