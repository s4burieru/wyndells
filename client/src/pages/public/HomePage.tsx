import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck, MapPin, MessageSquare, Star, UtensilsCrossed } from 'lucide-react'
import { fetchBranches } from '@/services/api/branches'
import { fetchMenuItems } from '@/services/api/menu'
import { fetchPublicFeedback } from '@/services/api/feedback'
import type { Branch, FeedbackSummary, MenuItem } from '@/types'
import { formatPrice } from '@/utils/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { StarRating } from '@/components/common/StatusBadges'
import { EmptyState } from '@/components/common/PageHeader'

export function HomePage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [reviews, setReviews] = useState<FeedbackSummary[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void Promise.allSettled([fetchBranches(), fetchMenuItems({ featuredOnly: true, limit: 6 }), fetchPublicFeedback()])
      .then(([branchResult, menuResult, feedbackResult]) => {
        if (branchResult.status === 'fulfilled') {
          setBranches(branchResult.value)
        }
        if (menuResult.status === 'fulfilled') {
          setMenuItems(menuResult.value.slice(0, 6))
        }
        if (feedbackResult.status === 'fulfilled') {
          setReviews(feedbackResult.value.slice(0, 3))
        }
      })
      .finally(() => setLoaded(true))
  }, [])

  return (
    <div>
      <HeroSection />
      <AboutSection />
      <BranchesSection branches={branches} loaded={loaded} />
      <FeaturedMenuSection items={menuItems} loaded={loaded} />
      <ReviewsSection reviews={reviews} loaded={loaded} />
      <ReservationCtaSection />
      <ContactTeaserSection />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-linear-to-br from-wyndell-cream via-wyndell-sand to-wyndell-orange/15">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Cpath d=\'M20 26 q-6-6-10-14 q-14-16-4-20 q-20-16-30-12 q-26-6-30 6 q-10-8-14 14 q-18 8-16 20 z\' fill=\'%23f0810d\'/%3E%3C/svg%3E")',
        }}
      />
      <div className="container-wyndell py-20 sm:py-28">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="bg-wyndell-green/15 text-wyndell-green-dark hover:bg-wyndell-green/20">
            <UtensilsCrossed />
            Al fresco dining · Garden grills · Home-style Filipino food
          </Badge>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-wyndell-forest sm:text-5xl">
            Fresh. Natural. Warm.
            <br />
            <span className="text-wyndell-orange-dark">This is Wyndell&rsquo;s.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-wyndell-ink">
            Seven branches across Rizal and Metro Manila serving charcoal-grilled favourites,
            seasonal freshness, and tables made for sharing.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="bg-wyndell-orange text-white shadow-md hover:bg-wyndell-orange-dark">
              <Link to="/reserve">
                <CalendarCheck />
                Book a Reservation
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-wyndell-green-dark/30 bg-white/70 text-wyndell-green-dark hover:bg-white hover:text-wyndell-green-dark">
              <Link to="/menu">
                Browse the Menu
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function AboutSection() {
  return (
    <section className="container-wyndell py-16">
      <Card className="mx-auto max-w-3xl border-wyndell-cream-dark bg-card text-center">
        <CardHeader>
          <CardTitle className="font-display text-3xl font-bold text-wyndell-forest">Rooted in Rizal, grown for family</CardTitle>
          <CardDescription className="text-lg leading-relaxed">
            Wyndell&rsquo;s started as a single al fresco kitchen along Marilaque Highway in Tanay — a small garden
            where neighbours gathered around the grill. Today our seven branches, from Tanay and Antipolo to
            Arca South in Taguig, share the same promise: ingredients dialed toward fresh, plates full of
            warmth, and a setting that always feels like outdoors.
          </CardDescription>
        </CardHeader>
      </Card>
    </section>
  )
}

function BranchesSection({ branches, loaded }: { branches: Branch[]; loaded: boolean }) {
  return (
    <section className="container-wyndell py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="size-5 text-wyndell-orange-dark" aria-hidden />
          <h2 className="font-display text-2xl font-bold text-wyndell-forest">Our branches</h2>
        </div>
        <Button asChild variant="link" className="text-wyndell-orange-dark">
          <Link to="/branches">
            View all branches
            <ArrowRight />
          </Link>
        </Button>
      </div>
      {!loaded ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Card key={key}>
              <CardHeader>
                <Skeleton className="size-10 rounded-full" />
                <Skeleton className="mt-2 h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : null}
      {loaded && branches.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">No branches published yet.</p> : null}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {branches.slice(0, 4).map((branch) => (
          <Card key={branch._id} className="transition-shadow hover:shadow-md">
            <CardHeader>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-wyndell-orange/10 text-sm font-bold text-wyndell-orange-dark">
                {(branch.name || 'W').charAt(0)}
              </span>
              <CardTitle className="mt-2 text-wyndell-forest">
                <Link to={`/branches/${branch.code}`} className="hover:underline">
                  {branch.name}
                </Link>
              </CardTitle>
              <CardDescription>{branch.city ?? branch.address}</CardDescription>
            </CardHeader>
            {branch.hours ? (
              <CardContent>
                <Badge variant="secondary" className="bg-wyndell-green/15 text-wyndell-green-dark hover:bg-wyndell-green/20">
                  {branch.hours}
                </Badge>
              </CardContent>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  )
}

function FeaturedMenuSection({ items, loaded }: { items: MenuItem[]; loaded: boolean }) {
  return (
    <section className="container-wyndell py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="size-5 text-wyndell-orange-dark" aria-hidden />
          <h2 className="font-display text-2xl font-bold text-wyndell-forest">Featured from the grill</h2>
        </div>
        <Button asChild variant="link" className="text-wyndell-orange-dark">
          <Link to="/menu">
            See the full menu
            <ArrowRight />
          </Link>
        </Button>
      </div>
      {!loaded ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Card key={key}>
              <CardHeader>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : null}
      {loaded && items.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">No featured dishes yet.</p> : null}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item._id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-wyndell-forest">{item.name}</CardTitle>
                <Badge variant="secondary" className="bg-wyndell-green/15 text-wyndell-green-dark hover:bg-wyndell-green/20">
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
    </section>
  )
}

function ReviewsSection({ reviews, loaded }: { reviews: FeedbackSummary[]; loaded: boolean }) {
  return (
    <section className="container-wyndell py-16">
      <div className="flex items-center gap-2">
        <Star className="size-5 text-wyndell-orange-dark" aria-hidden />
        <h2 className="font-display text-2xl font-bold text-wyndell-forest">What our guests say</h2>
      </div>
      {!loaded ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Card key={key}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : null}
      {loaded && reviews.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No reviews yet" message="Be the first to leave a review." />
        </div>
      ) : null}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <Card key={review._id}>
            <CardHeader>
              <StarRating value={review.rating} size="sm" />
              <CardDescription className="text-sm leading-relaxed text-foreground">
                &ldquo;{review.comment}&rdquo;
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs font-medium text-muted-foreground">
                — {review.customerName} · {review.branch?.name}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

function ReservationCtaSection() {
  return (
    <section className="container-wyndell py-16">
      <Card className="border-0 bg-linear-to-r from-wyndell-orange/15 via-wyndell-cream to-wyndell-green/10 p-8 sm:p-12">
        <CardHeader className="px-0">
          <Badge variant="secondary" className="w-fit bg-white/70 text-wyndell-orange-dark hover:bg-white">
            <CalendarCheck />
            Online reservations
          </Badge>
          <CardTitle className="font-display text-3xl font-bold text-wyndell-forest">Plan your visit</CardTitle>
          <CardDescription className="max-w-2xl text-base text-wyndell-ink">
            Reserve a table online in under a minute — no account needed. Pick a branch, a time that suits you,
            and we&rsquo;ll have the grill ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Button asChild size="lg" className="bg-wyndell-orange text-white shadow-md hover:bg-wyndell-orange-dark">
            <Link to="/reserve">
              Book a Reservation
              <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}

function ContactTeaserSection() {
  return (
    <section className="container-wyndell py-16">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5 text-wyndell-orange-dark" aria-hidden />
            <CardTitle className="font-display text-2xl font-bold text-wyndell-forest">Reach us</CardTitle>
          </div>
          <CardDescription className="text-base text-wyndell-ink">
            Questions, large groups, or feedback? Find a branch&rsquo;s contact details on our{' '}
            <Button asChild variant="link" className="h-auto p-0 text-wyndell-orange-dark">
              <Link to="/branches">branches page</Link>
            </Button>
            , or visit our{' '}
            <Button asChild variant="link" className="h-auto p-0 text-wyndell-orange-dark">
              <Link to="/contact">contact page</Link>
            </Button>
            .
          </CardDescription>
        </CardHeader>
      </Card>
      <Separator className="mt-16" />
    </section>
  )
}