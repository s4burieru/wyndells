import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchBranch, fetchBranches } from '../../api/branches'
import { fetchMenuItems } from '../../api/menu'
import type { Branch, MenuItem } from '../../lib/types'
import { formatPrice } from '../../lib/format'
import { ApiError } from '../../lib/api'
import { Badge, ErrorState, Spinner } from '../../components/ui/display'

export function BranchDetailPage() {
  const { code } = useParams()
  const [branch, setBranch] = useState<Branch | null>(null)
  const [others, setOthers] = useState<Branch[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!code) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    setNotFound(false)
    void fetchBranch(code)
      .then(async (found) => {
        setBranch(found)
        try {
          setItems(await fetchMenuItems({ branch: found._id, featuredOnly: true, limit: 4 }))
        } catch {
          // The menu is a nice-to-have on this page; never block it on a menu error.
        }
      })
      .catch((caught) => {
        if (caught instanceof ApiError && caught.statusCode === 404) {
          setNotFound(true)
        } else {
          setError(true)
        }
      })
      .finally(() => setLoading(false))
    void fetchBranches()
      .then((all) => setOthers(all.filter((b) => b.code !== code)))
      .catch(() => {})
  }, [code])

  if (loading) {
    return <div className="container-wyndell"><Spinner label="Loading branch…" /></div>
  }
  if (notFound) {
    return (
      <div className="container-wyndell py-12">
        <div className="rounded-2xl border border-dashed border-wyndell-cream-dark bg-white px-6 py-10 text-center">
          <p className="font-display text-2xl font-bold text-wyndell-forest">Branch not found</p>
          <p className="mt-2 text-sm text-neutral-500">We couldn’t find that location. It may have been renamed or removed.</p>
          <Link
            to="/branches"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-wyndell-orange px-4 py-2 text-sm font-semibold text-white hover:bg-wyndell-orange-dark"
          >
            View all branches
          </Link>
        </div>
      </div>
    )
  }
  if (error || !branch) {
    return (
      <div className="container-wyndell">
        <ErrorState message="Unable to load this branch right now." />
        <Link to="/branches" className="mt-4 inline-block text-sm font-medium text-wyndell-orange-dark hover:underline">
          ← Back to all branches
        </Link>
      </div>
    )
  }
  return (
    <div className="container-wyndell py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-neutral-500">
        <Link to="/branches" className="hover:text-wyndell-orange-dark hover:underline">All branches</Link>
        <span className="mx-1.5">/</span>
        <span className="text-wyndell-ink">{branch.name}</span>
      </nav>

      <div className="mt-6 overflow-hidden rounded-3xl border border-wyndell-cream-dark bg-white shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="h-48 w-full shrink-0 overflow-hidden md:h-72 md:w-96">
            {branch.image ? (
              <img
                src={branch.image}
                alt={`${branch.name} — Wyndell’s garden dining`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-wyndell-cream via-wyndell-sand to-wyndell-orange/15">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-wyndell-orange/10 text-3xl font-bold text-wyndell-orange-dark">
                  {(branch.name || 'W').charAt(0)}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 p-6 md:p-8">
            <p className="text-sm font-medium text-wyndell-green-dark">{branch.city || 'Wyndell’s'}</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-wyndell-forest">{branch.name}</h1>
            {branch.hours ? <p className="mt-1 text-sm font-medium text-wyndell-ink">🕐 {branch.hours}</p> : null}
            <p className="mt-4 max-w-xl leading-relaxed text-wyndell-ink">
              {branch.description || 'A warm Wyndell’s garden dining experience.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                to={`/reserve?branch=${branch._id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-wyndell-orange px-4 py-2 text-sm font-semibold text-white hover:bg-wyndell-orange-dark"
              >
                Reserve at {branch.name.split(',')[0]}
              </Link>
              <Link
                to={`/menu?branch=${branch._id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-wyndell-green-dark/30 px-4 py-2 text-sm font-semibold text-wyndell-green-dark hover:bg-wyndell-green/10"
              >
                View full menu
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <DetailCard label="Address">📍 {branch.address || '—'}</DetailCard>
        <DetailCard label="Phone">📞 {branch.contactNumber || '—'}</DetailCard>
        <DetailCard label="Email">✉️ {branch.email || '—'}</DetailCard>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold text-wyndell-forest">Featured at {branch.name.split(',')[0]}</h2>
          <Link to={`/menu?branch=${branch._id}`} className="text-sm font-medium text-wyndell-orange-dark hover:underline">
            See the full menu →
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="mt-5 text-sm text-neutral-500">Browse the full menu for this branch.</p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <article key={item._id} className="rounded-2xl border border-wyndell-cream-dark bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-wyndell-forest">{item.name}</h3>
                  <span className="shrink-0 rounded-full bg-wyndell-green/10 px-2.5 py-1 text-xs font-bold text-wyndell-green-dark">
                    {formatPrice(item.price)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{item.description}</p>
                <div className="mt-2">
                  <Badge className="bg-wyndell-cream-dark/60 text-wyndell-ink">{item.category}</Badge>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {others.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold text-wyndell-forest">Other Wyndell’s branches</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {others.map((other) => (
              <Link
                key={other._id}
                to={`/branches/${other.code}`}
                className="rounded-full border border-wyndell-cream-dark bg-white px-3.5 py-1.5 text-sm font-medium text-wyndell-ink hover:border-wyndell-orange/40 hover:bg-wyndell-cream-dark/60"
              >
                {other.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function DetailCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-wyndell-cream-dark bg-white p-5 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</h3>
      <p className="mt-2 text-sm leading-relaxed text-wyndell-ink">{children}</p>
    </div>
  )
}