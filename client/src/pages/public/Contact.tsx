import { useEffect, useState } from 'react'
import { fetchBranches } from '../../api/branches'
import type {  Branch  } from '../../lib/types'
import { Spinner } from '../../components/ui/display'

export function ContactPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchBranches().then(setBranches).catch(() => undefined).finally(() => setLoading(false))
  }, [])

  return (
    <div className="container-wyndell py-12">
      <h1 className="font-display text-3xl font-bold text-wyndell-forest">Contact us</h1>
      <p className="mt-2 max-w-2xl text-wyndell-ink">
        Reach the branch nearest you directly. For online bookings, you can also use our{' '}
        <a href="/reserve" className="font-medium text-wyndell-orange-dark underline">reservation page</a>.
      </p>

      {loading ? <div className="mt-8"><Spinner label="Loading branches…" /></div> : null}
      {!loading && branches.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">Branch contact details are not available right now.</p>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {branches.map((branch) => (
          <article key={branch._id} className="rounded-2xl border border-wyndell-cream-dark bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-wyndell-forest">{branch.name}</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-wyndell-ink">
              <li>📍 {branch.address || 'Address coming soon'}</li>
              {branch.contactNumber ? <li>📞 {branch.contactNumber}</li> : null}
              {branch.email ? <li>✉️ {branch.email}</li> : null}
              <li>🕑 {branch.hours}</li>
            </ul>
          </article>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-wyndell-cream-dark bg-wyndell-cream p-6">
        <h2 className="text-lg font-semibold text-wyndell-forest">General inquiries</h2>
        <p className="mt-2 text-sm text-wyndell-ink">
          Questions about group events, private bookings, or partnerships? Send a message to any branch
          above, or drop by the location nearest you — our team is always happy to help.
        </p>
      </div>
    </div>
  )
}