import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBranches } from '../../api/branches'
import type {  Branch  } from '../../lib/types'
import { ErrorState, Spinner } from '../../components/ui/display'

export function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = () => {
    setLoading(true)
    setError(false)
    void fetchBranches()
      .then(setBranches)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  if (loading) {
    return <div className="container-wyndell"><Spinner label="Loading branches…" /></div>
  }
  if (error) {
    return <div className="container-wyndell"><ErrorState message="Unable to load branches right now." onRetry={load} /></div>
  }

  return (
    <div className="container-wyndell py-12">
      <h1 className="font-display text-3xl font-bold text-wyndell-forest">Our branches</h1>
      <p className="mt-2 max-w-2xl text-wyndell-ink">
        Four garden locations across Rizal. Choose the branch nearest you, then book a table online.
      </p>

      {branches.length === 0 ? (
        <p className="mt-10 text-sm text-neutral-500">No branches published yet. Please check back soon.</p>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {branches.map((branch) => (
          <article key={branch._id} className="rounded-2xl border border-wyndell-cream-dark bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-wyndell-orange/10 text-lg font-bold text-wyndell-orange-dark">
                {branch.name.charAt(0)}
              </span>
              <div>
                <h2 className="text-lg font-bold text-wyndell-forest">{branch.name}</h2>
                <p className="text-xs font-medium text-wyndell-green-dark">{branch.hours}</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-wyndell-ink">
              {branch.description || 'A warm Wyndell’s garden dining experience.'}
            </p>
            <dl className="mt-4 grid gap-x-6 gap-y-1 text-sm">
              {branch.address ? (
                <div className="flex items-center gap-2">
                  <dt className="sr-only">Address</dt>
                  <dd className="text-neutral-600">📍 {branch.address}</dd>
                </div>
              ) : null}
              {branch.contactNumber ? (
                <div className="flex items-center gap-2">
                  <dt className="sr-only">Phone</dt>
                  <dd className="text-neutral-600">📞 {branch.contactNumber}</dd>
                </div>
              ) : null}
              {branch.email ? (
                <div className="flex items-center gap-2">
                  <dt className="sr-only">Email</dt>
                  <dd className="text-neutral-600">✉️ {branch.email}</dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to={`/reserve?branch=${branch._id}`}
                className="rounded-lg bg-wyndell-orange px-4 py-2 text-sm font-semibold text-white hover:bg-wyndell-orange-dark"
              >
                Reserve at {branch.name.split(',')[0]}
              </Link>
              <Link
                to={`/menu?branch=${branch._id}`}
                className="rounded-lg border border-wyndell-green-dark/30 px-4 py-2 text-sm font-semibold text-wyndell-green-dark hover:bg-wyndell-green/10"
              >
                View menu
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}