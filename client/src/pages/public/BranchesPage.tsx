import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck, Mail, MapPin, Phone, UtensilsCrossed } from 'lucide-react'
import { fetchBranches } from '@/services/api/branches'
import type { Branch } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState, PageHeader } from '@/components/common/PageHeader'

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
    return (
      <div className="container-wyndell py-12">
        <PageHeader title="Our branches" subtitle="Loading garden locations…" />
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {[0, 1, 2, 3].map((key) => (
            <Card key={key}>
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  if (error) {
    return <div className="container-wyndell"><ErrorState message="Unable to load branches right now." onRetry={load} /></div>
  }

  return (
    <div className="container-wyndell py-12">
      <PageHeader
        title="Our branches"
        subtitle="Seven Wyndell's locations across Rizal and Metro Manila. Choose the branch nearest you, then book a table online."
        action={
          <Button asChild className="bg-wyndell-orange text-white hover:bg-wyndell-orange-dark">
            <Link to="/reserve">
              <CalendarCheck />
              Book a table
            </Link>
          </Button>
        }
      />

      {branches.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="No branches yet" message="No branches published yet. Please check back soon." />
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {branches.map((branch) => (
          <Card key={branch._id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-wyndell-orange/10 text-lg font-bold text-wyndell-orange-dark">
                  {branch.name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <CardTitle className="text-wyndell-forest">
                    <Link to={`/branches/${branch.code}`} className="hover:underline">
                      {branch.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>{branch.hours || branch.city}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-sm leading-relaxed">
                {branch.description || 'A warm Wyndell’s garden dining experience.'}
              </p>
              <div className="grid gap-1.5 text-sm text-muted-foreground">
                {branch.address ? (
                  <span className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-wyndell-orange-dark" aria-hidden />
                    {branch.address}
                  </span>
                ) : null}
                {branch.contactNumber ? (
                  <span className="flex items-start gap-2">
                    <Phone className="mt-0.5 size-4 shrink-0 text-wyndell-orange-dark" aria-hidden />
                    {branch.contactNumber}
                  </span>
                ) : null}
                {branch.email ? (
                  <span className="flex items-start gap-2">
                    <Mail className="mt-0.5 size-4 shrink-0 text-wyndell-orange-dark" aria-hidden />
                    {branch.email}
                  </span>
                ) : null}
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" className="bg-wyndell-orange text-white hover:bg-wyndell-orange-dark">
                  <Link to={`/reserve?branch=${branch._id}`}>
                    Reserve at {branch.name.split(',')[0]}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/menu?branch=${branch._id}`}>
                    <UtensilsCrossed />
                    View menu
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link to={`/branches/${branch.code}`}>
                    Branch details
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
              <Badge variant="outline" className="w-fit">{branch.city || 'Rizal'}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}