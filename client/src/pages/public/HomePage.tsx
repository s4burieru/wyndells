import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck } from 'lucide-react'
import heroHome from '@/assets/images/hero-home.png'
import { fetchBranches } from '@/services/api/branches'
import { fetchMenuItems } from '@/services/api/menu'
import { fetchPublicFeedback } from '@/services/api/feedback'
import type { Branch, FeedbackSummary, MenuItem } from '@/types'
import { formatPrice } from '@/utils/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StarRating } from '@/components/common/StatusBadges'
import { EmptyState } from '@/components/common/PageHeader'
import { SectionHeading } from '@/components/common/SectionHeading'

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
    <section className="relative flex h-[calc(100svh-var(--navbar-height,4rem))] items-center overflow-hidden bg-wyndell-sand">
      {/* full-bleed hero photo */}
      <img
        src={heroHome}
        alt=""
        aria-hidden
        fetchPriority="high"
        className="absolute inset-0 size-full object-cover"
      />
      <div className="container-wyndell relative py-20 sm:py-28">
        <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-wyndell-green-dark/20 bg-white/70 px-3 py-1 text-xs font-semibold tracking-wide text-wyndell-green-dark">
              <span aria-hidden className="size-1.5 rounded-full bg-wyndell-green" />
              Al fresco dining · Garden grills · Home-style Filipino food
            </span>
            <h1 className="mt-5 font-display text-4xl leading-[1.1] font-semibold text-wyndell-forest sm:text-6xl">
              Fresh. Natural. Warm.
              <br />
              <span className="text-wyndell-orange-dark">This is Wyndell&rsquo;s.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-wyndell-ink/80">
              Seven branches across Rizal and Metro Manila serving charcoal-grilled favourites,
              seasonal freshness, and tables made for sharing.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full bg-wyndell-orange px-7 text-white shadow-lg shadow-wyndell-orange/25 transition-colors hover:bg-wyndell-orange-dark">
                <Link to="/reserve">
                  <CalendarCheck />
                  Book a Reservation
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-wyndell-forest/15 bg-white/70 text-wyndell-forest hover:bg-white hover:text-wyndell-forest"
              >
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
      <div className="mx-auto max-w-3xl text-center">
        <span className="text-xs font-semibold tracking-[0.18em] text-wyndell-orange-dark uppercase">Our story</span>
        <h2 className="mt-2 font-display text-3xl font-semibold text-wyndell-forest sm:text-4xl">
          Rooted in Rizal, grown for family
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-wyndell-ink/80">
          Wyndell&rsquo;s started as a single al fresco kitchen along Marilaque Highway in Tanay — a small garden
          where neighbours gathered around the grill. Today our seven branches, from Tanay and Antipolo to
          Arca South in Taguig, share the same promise: ingredients dialed toward fresh, plates full of
          warmth, and a setting that always feels like outdoors.
        </p>
        <div aria-hidden className="mx-auto mt-6 h-px w-24 bg-linear-to-r from-transparent via-wyndell-orange/60 to-transparent" />
      </div>
    </section>
  )
}

function BranchesSection({ branches, loaded }: { branches: Branch[]; loaded: boolean }) {
  return (
    <section className="container-wyndell py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
      <SectionHeading
        eyebrow="Find us"
        title="Our branches"
        action={{ to: '/branches', label: 'View all branches' }}
      />
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
      <SectionHeading
        eyebrow="The menu"
        title="Featured from the grill"
        action={{ to: '/menu', label: 'See the full menu' }}
      />
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
      <SectionHeading
        eyebrow="Guest stories"
        title="What our guests say"
        align="left"
      />
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
      <div className="relative overflow-hidden rounded-3xl bg-wyndell-forest px-6 py-12 text-center shadow-xl shadow-wyndell-forest/20 sm:px-12 sm:py-16">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-16 size-72 rounded-full bg-wyndell-sun/10 blur-3xl" />
          <div className="absolute -bottom-28 -left-20 size-80 rounded-full bg-wyndell-orange/15 blur-3xl" />
        </div>
        <div className="relative">
          <span className="text-xs font-semibold tracking-[0.18em] text-wyndell-sun uppercase">Online reservations</span>
          <h2 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">Plan your visit</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/75">
            Reserve a table online in under a minute — no account needed. Pick a branch, a time that suits you,
            and we&rsquo;ll have the grill ready.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-full bg-wyndell-orange px-7 text-white shadow-lg shadow-black/20 hover:bg-wyndell-orange-dark">
              <Link to="/reserve">
                Book a Reservation
                <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-white/25 bg-transparent px-7 text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/check">Check a Reservation</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function ContactTeaserSection() {
  return (
    <section className="container-wyndell py-16 text-center">
      <p className="text-base leading-relaxed text-wyndell-ink/80">
        Questions, large groups, or feedback? Find a branch&rsquo;s contact details on our{' '}
        <Link to="/branches" className="font-semibold text-wyndell-orange-dark underline-offset-4 hover:underline">
          branches page
        </Link>
        , or visit our{' '}
        <Link to="/contact" className="font-semibold text-wyndell-orange-dark underline-offset-4 hover:underline">
          contact page
        </Link>
        .
      </p>
    </section>
  )
}
