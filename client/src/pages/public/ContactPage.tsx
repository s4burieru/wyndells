import { useEffect, useState } from 'react'
import { Clock3, Mail, MapPin, MessageSquare, Phone } from 'lucide-react'
import { fetchBranches } from '../../api/branches'
import type { Branch } from '../../lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, PageHeader } from '../../components/ui/display'
import { Link } from 'react-router-dom'

export function ContactPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchBranches().then(setBranches).catch(() => undefined).finally(() => setLoading(false))
  }, [])

  return (
    <div className="container-wyndell py-12">
      <PageHeader
        title="Contact us"
        subtitle="Reach the branch nearest you directly."
        action={
          <Button asChild className="bg-wyndell-orange text-white hover:bg-wyndell-orange-dark">
            <Link to="/reserve">Book a reservation</Link>
          </Button>
        }
      />

      {loading ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {[0, 1].map((key) => (
            <Card key={key}>
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : null}
      {!loading && branches.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Contact details unavailable" message="Branch contact details are not available right now." />
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {branches.map((branch) => (
          <Card key={branch._id}>
            <CardHeader>
              <CardTitle className="text-wyndell-forest">{branch.name}</CardTitle>
              <CardDescription>{branch.city ?? 'Rizal, Philippines'}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 text-sm">
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-wyndell-orange-dark" aria-hidden />
                  <span>{branch.address || 'Address coming soon'}</span>
                </li>
                {branch.contactNumber ? (
                  <li className="flex items-start gap-2">
                    <Phone className="mt-0.5 size-4 shrink-0 text-wyndell-orange-dark" aria-hidden />
                    <span>{branch.contactNumber}</span>
                  </li>
                ) : null}
                {branch.email ? (
                  <li className="flex items-start gap-2">
                    <Mail className="mt-0.5 size-4 shrink-0 text-wyndell-orange-dark" aria-hidden />
                    <span>{branch.email}</span>
                  </li>
                ) : null}
                <li className="flex items-start gap-2">
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-wyndell-orange-dark" aria-hidden />
                  <span>{branch.hours}</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-10 bg-wyndell-cream">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5 text-wyndell-orange-dark" aria-hidden />
            <CardTitle className="text-wyndell-forest">General inquiries</CardTitle>
          </div>
          <CardDescription className="text-sm text-wyndell-ink">
            Questions about group events, private bookings, or partnerships? Send a message to any branch
            above, or drop by the location nearest you — our team is always happy to help.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}