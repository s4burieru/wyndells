import { useEffect, useState } from 'react'
import { ArrowRight, Briefcase } from 'lucide-react'
import { fetchCareers } from '../../api/careers'
import type { CareerPosting } from '../../lib/types'
import { departmentLabel } from '../../lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState, PageHeader } from '../../components/ui/display'
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
    return (
      <div className="container-wyndell py-10">
        <PageHeader title="Join the Wyndell's family" subtitle="Loading open positions…" />
        <div className="mt-8 space-y-6">
          {[0, 1].map((key) => (
            <Card key={key}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
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
      <PageHeader
        title="Join the Wyndell's family"
        subtitle="We're always looking for warm, hardworking people for our restaurants and cafes across Rizal. Pick a position below to get started."
      />

      {postings.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="No open positions right now" message="Please check back soon — new roles open up regularly." />
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {postings.map((posting) => (
            <Card key={posting._id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-wyndell-green/15">
                      <Briefcase className="size-5 text-wyndell-green-dark" aria-hidden />
                    </span>
                    <div>
                      <CardTitle className="text-wyndell-forest">{posting.title}</CardTitle>
                      <CardDescription>
                        {posting.branch.name} · {departmentLabel(posting.department)} · {posting.employmentType}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setSelected(posting)
                      document.getElementById('apply-form')?.focus()
                    }}
                    className="bg-wyndell-green text-white hover:bg-wyndell-green-dark"
                  >
                    Apply
                    <ArrowRight />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                <p className="text-sm leading-relaxed">{posting.summary || posting.description}</p>
                {posting.requirements ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <Badge variant="outline" className="mr-2 border-wyndell-orange/40 text-wyndell-orange-dark">
                      What we&rsquo;re looking for
                    </Badge>
                    {posting.requirements}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-12">
        <CareerApplicationForm posting={selected} onApplied={() => setSelected(null)} />
      </div>
    </div>
  )
}