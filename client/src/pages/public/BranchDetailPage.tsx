import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarCheck, Clock3, Mail, MapPin, Phone, UtensilsCrossed } from 'lucide-react'
import { fetchBranch, fetchBranches } from '@/services/api/branches'
import { fetchMenuItems } from '@/services/api/menu'
import type { Branch, MenuItem } from '@/types'
import { formatPrice } from '@/utils/format'
import { ApiError } from '@/services/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState, PageHeader } from '@/components/common/PageHeader'

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
    return (
      <div className="container-wyndell py-8">
        <Skeleton className="h-9 w-full max-w-xl" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    )
  }
  if (notFound) {
    return (
      <div className="container-wyndell py-12">
        <Card className="border-dashed text-center">
          <CardHeader>
            <CardTitle className="font-display text-2xl font-bold text-wyndell-forest">Branch not found</CardTitle>
            <CardDescription>We couldn’t find that location. It may have been renamed or removed.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild className="bg-wyndell-orange text-white hover:bg-wyndell-orange-dark">
              <Link to="/branches">View all branches</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  if (error || !branch) {
    return (
      <div className="container-wyndell grid gap-4 py-8">
        <ErrorState message="Unable to load this branch right now." />
        <Button asChild variant="link" className="w-fit text-wyndell-orange-dark">
          <Link to="/branches">
            <ArrowLeft />
            Back to all branches
          </Link>
        </Button>
      </div>
    )
  }
  return (
    <div className="container-wyndell py-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Button asChild variant="link" className="h-auto p-0 text-muted-foreground">
          <Link to="/branches">All branches</Link>
        </Button>
        <span aria-hidden>/</span>
        <span className="text-foreground">{branch.name}</span>
      </nav>

      <Card className="mt-6 overflow-hidden py-0">
        <div className="flex flex-col gap-0 md:flex-row md:items-stretch">
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
            <Badge variant="secondary" className="bg-wyndell-green/15 text-wyndell-green-dark hover:bg-wyndell-green/20">
              {branch.city || 'Wyndell’s'}
            </Badge>
            <PageHeader title={branch.name} subtitle={branch.hours || undefined} />
            <p className="mt-4 max-w-xl leading-relaxed">
              {branch.description || 'A warm Wyndell’s garden dining experience.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild className="bg-wyndell-orange text-white hover:bg-wyndell-orange-dark">
                <Link to={`/reserve?branch=${branch._id}`}>
                  <CalendarCheck />
                  Reserve at {branch.name.split(',')[0]}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={`/menu?branch=${branch._id}`}>
                  <UtensilsCrossed />
                  View full menu
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <DetailCard icon={<MapPin className="size-4 text-wyndell-orange-dark" aria-hidden />} label="Address">{branch.address || '—'}</DetailCard>
        <DetailCard icon={<Phone className="size-4 text-wyndell-orange-dark" aria-hidden />} label="Phone">{branch.contactNumber || '—'}</DetailCard>
        <DetailCard icon={<Mail className="size-4 text-wyndell-orange-dark" aria-hidden />} label="Email">{branch.email || '—'}</DetailCard>
      </div>
      {branch.hours ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock3 className="size-4 text-wyndell-orange-dark" aria-hidden />
          {branch.hours}
        </p>
      ) : null}

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PageHeader title={`Featured at ${branch.name.split(',')[0]}`} />
          <Button asChild variant="link" className="text-wyndell-orange-dark">
            <Link to={`/menu?branch=${branch._id}`}>
              See the full menu
              <ArrowRight />
            </Link>
          </Button>
        </div>
        {items.length === 0 ? (
          <div className="mt-5">
            <EmptyState title="No featured dishes" message="Browse the full menu for this branch." />
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <Card key={item._id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-wyndell-forest">{item.name}</CardTitle>
                    <Badge variant="secondary" className="shrink-0 bg-wyndell-green/15 text-wyndell-green-dark hover:bg-wyndell-green/20">
                      {formatPrice(item.price)}
                    </Badge>
                  </div>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">{item.category}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {others.length > 0 ? (
        <section className="mt-10">
          <PageHeader title="Other Wyndell’s branches" />
          <Separator className="my-4" />
          <div className="flex flex-wrap gap-2">
            {others.map((other) => (
              <Button key={other._id} asChild variant="outline" size="sm">
                <Link to={`/branches/${other.code}`}>
                  {other.name}
                </Link>
              </Button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function DetailCard({ icon, label, children }: { icon?: ReactNode; label: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed">{children}</p>
      </CardContent>
    </Card>
  )
}