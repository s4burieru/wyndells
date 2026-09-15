import { useEffect, useState } from 'react'
import { fetchCareers } from '../../api/careers'
import type {  CareerPosting  } from '../../lib/types'
import { departmentLabel } from '../../lib/format'
import { Button } from '../../components/ui/controls'
import { EmptyState, ErrorState, Spinner } from '../../components/ui/display'
import { CareerApplicationForm } from './CareerApplicationForm'

export function CareersPage() {
  const [postings, setPostings] = useState<CareerPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<CareerPosting | null>(null)

  useEffect(() => {
    void fetchCareers()
      .then(setPostings)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="container-wyndell"><Spinner label="Loading open positions…" /></div>
  }
  if (error) {
    return (
      <div className="container-wyndell">
        <ErrorState
          message="Unable to load open positions right now."
          onRetry={() => {
            setLoading(true)
            setError(false)
            void fetchCareers().then(setPostings).catch(() => setError(true)).finally(() => setLoading(false))
          }}
        />
      </div>
    )
  }

  return (
    <div className="container-wyndell py-10">
      <h1 className="font-display text-3xl font-bold text-wyndell-forest">Join the Wyndell&rsquo;s family</h1>
      <p className="mt-2 max-w-2xl text-wyndell-ink">
        We&rsquo;re always looking for warm, hardworking people for our restaurants and cafes across Rizal.
        Pick a position below to get started.
      </p>

      {postings.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="No open positions right now" message="Please check back soon — new roles open up regularly." />
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {postings.map((posting) => (
            <article key={posting._id} className="rounded-2xl border border-wyndell-cream-dark bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-wyndell-forest">{posting.title}</h2>
                  <p className="mt-1 text-xs font-medium text-neutral-500">
                    {posting.branch.name} · {departmentLabel(posting.department)} · {posting.employmentType}
                  </p>
                </div>
                <Button
                  variant="green"
                  onClick={() => {
                    setSelected(posting)
                    document.getElementById('apply-form')?.focus()
                  }}
                >
                  Apply
                </Button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-wyndell-ink">{posting.summary || posting.description}</p>
              {posting.requirements ? (
                <p className="mt-3 text-xs leading-relaxed text-neutral-500">
                  <span className="font-semibold text-wyndell-orange-dark">What we&rsquo;re looking for: </span>
                  {posting.requirements}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <div className="mt-12">
        <CareerApplicationForm posting={selected} onApplied={() => setSelected(null)} />
      </div>
    </div>
  )
}