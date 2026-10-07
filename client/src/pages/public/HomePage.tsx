import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck, CalendarDays, Check, Megaphone, PartyPopper, Ticket } from 'lucide-react'
import heroHome from '@/assets/images/hero-home.png'
import { fetchBranches } from '@/services/api/branches'
import { fetchMenuItems } from '@/services/api/menu'
import { fetchPublicFeedback } from '@/services/api/feedback'
import { fetchPublicPromotions } from '@/services/api/promotions'
import { subscribeNewsletter } from '@/services/api/newsletter'
import type { Branch, FeedbackSummary, MenuItem, Promotion, PromotionKind } from '@/types'
import { formatDate, formatPrice, friendlyError } from '@/utils/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Field, TextInput } from '@/components/common/FormControls'
import { StarRating } from '@/components/common/StatusBadges'
import { EmptyState } from '@/components/common/PageHeader'
import { SectionHeading } from '@/components/common/SectionHeading'
import { MenuItemImage } from '@/features/menu/components/MenuItemImage'

/** localStorage flag set after a successful signup — keeps the popup away. */
const SUBSCRIBED_KEY = 'wyndells:subscribed'

export function HomePage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [reviews, setReviews] = useState<FeedbackSummary[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void Promise.allSettled([
      fetchBranches(),
      fetchMenuItems({ featuredOnly: true, limit: 6 }),
      fetchPublicFeedback(),
      fetchPublicPromotions(6),
    ])
      .then(([branchResult, menuResult, feedbackResult, promotionResult]) => {
        if (branchResult.status === 'fulfilled') {
          setBranches(branchResult.value)
        }
        if (menuResult.status === 'fulfilled') {
          setMenuItems(menuResult.value.slice(0, 6))
        }
        if (feedbackResult.status === 'fulfilled') {
          setReviews(feedbackResult.value.slice(0, 3))
        }
        if (promotionResult.status === 'fulfilled') {
          setPromotions(promotionResult.value)
        }
      })
      .finally(() => setLoaded(true))
  }, [])

  return (
    <div>
      <HeroSection />
      <AboutSection />
      <PromotionsSection promotions={promotions} loaded={loaded} />
      <BranchesSection branches={branches} loaded={loaded} />
      <FeaturedMenuSection items={menuItems} loaded={loaded} />
      <ReviewsSection reviews={reviews} loaded={loaded} />
      <ReservationCtaSection />
      <NewsletterSection />
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
              <Button asChild size="lg" className="rounded-full px-7 shadow-lg shadow-wyndell-orange/25 transition-colors">
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

/** Maps a promotion kind to its icon and card label. */
const PROMOTION_KIND_META: Record<PromotionKind, { label: string; icon: typeof Ticket }> = {
  promotion: { label: 'Promotion', icon: Ticket },
  event: { label: 'Event', icon: PartyPopper },
  announcement: { label: 'Announcement', icon: Megaphone },
}

/** Photo shown on a card, falling back to a branded gradient when there is none. */
function PromotionImage({ promotion }: { promotion: Promotion }) {
  const [failed, setFailed] = useState(false)
  const meta = PROMOTION_KIND_META[promotion.kind]
  const Icon = meta.icon
  const showImage = promotion.image !== '' && !failed

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-linear-to-br from-wyndell-cream to-wyndell-sand">
      {showImage ? (
        <img
          src={promotion.image}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <div aria-hidden className="flex size-full items-center justify-center">
          <Icon className="size-8 text-wyndell-orange/60" />
        </div>
      )}
      <Badge
        variant="secondary"
        className="absolute top-3 left-3 bg-white/90 text-wyndell-green-dark shadow-sm hover:bg-white"
      >
        <Icon className="size-3" aria-hidden />
        {meta.label}
      </Badge>
    </div>
  )
}

function PromotionsSection({ promotions, loaded }: { promotions: Promotion[]; loaded: boolean }) {
  return (
    <section className="container-wyndell py-16">
      <SectionHeading
        eyebrow="Happening at Wyndell's"
        title="Promotions & announcements"
        align="left"
      />
      {!loaded ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Card key={key}>
              <Skeleton className="aspect-video w-full rounded-none" />
              <CardHeader>
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : null}
      {loaded && promotions.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No promotions right now — check back soon.</p>
      ) : null}
      {promotions.length > 0 ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {promotions.map((promotion) => (
            <Card key={promotion._id} className="overflow-hidden transition-shadow hover:shadow-md">
              <PromotionImage promotion={promotion} />
              <CardHeader>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5 text-wyndell-orange-dark" aria-hidden />
                    {formatDate(promotion.eventDate)}
                  </span>
                  {promotion.branch ? (
                    <Badge variant="outline" className="text-wyndell-green-dark">
                      {promotion.branch.name}
                    </Badge>
                  ) : null}
                </div>
                <CardTitle className="text-wyndell-forest">{promotion.title}</CardTitle>
                {promotion.summary ? (
                  <CardDescription className="line-clamp-2">{promotion.summary}</CardDescription>
                ) : null}
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : null}
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
          <Card key={item._id} className="overflow-hidden">
            <MenuItemImage src={item.image} alt={item.name} className="-mt-6 aspect-[16/10] w-full" />
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
            <Button asChild size="lg" className="rounded-full px-7 shadow-lg shadow-black/20">
              <Link to="/reserve">
                Reserve your table
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

function NewsletterSection() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim()) {
      setError('Please add your email address.')
      return
    }
    setSubmitting(true)
    setError('')
    void subscribeNewsletter({ name: name.trim(), email: email.trim(), source: 'homepage' })
      .then(() => {
        setDone(true)
        setName('')
        setEmail('')
        try {
          localStorage.setItem(SUBSCRIBED_KEY, '1')
        } catch {
          // Storage can be blocked (private mode) — the popup is only a nicety.
        }
      })
      .catch((reason: unknown) => setError(friendlyError(reason)))
      .finally(() => setSubmitting(false))
  }

  return (
    <section className="container-wyndell py-16">
      <div className="relative overflow-hidden rounded-3xl bg-wyndell-forest px-6 py-12 shadow-xl shadow-wyndell-forest/20 sm:px-12 sm:py-14">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-16 size-72 rounded-full bg-wyndell-sun/10 blur-3xl" />
          <div className="absolute -bottom-28 -left-20 size-80 rounded-full bg-wyndell-orange/15 blur-3xl" />
        </div>
        <div className="relative mx-auto grid max-w-3xl gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="text-xs font-semibold tracking-[0.18em] text-wyndell-sun uppercase">
              Newsletter
            </span>
            <h2 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
              Stay in the loop
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/75">
              Get updates on Wyndell&rsquo;s latest offers, events, new menu items, and restaurant
              announcements.
            </p>
          </div>

          {done ? (
            <div className="rounded-2xl bg-white/10 p-6 text-white backdrop-blur-sm">
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-wyndell-green">
                <Check className="size-5 text-white" aria-hidden />
              </span>
              <p className="mt-3 font-semibold">You&rsquo;re on the list!</p>
              <p className="mt-1 text-sm leading-relaxed text-white/75">
                Thanks{name ? `, ${name}` : ''} — watch your inbox for what&rsquo;s next at
                Wyndell&rsquo;s.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
              <Field label="Name">
                <TextInput
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Maria Santos"
                  maxLength={120}
                  autoComplete="name"
                  className="border-white/25 bg-white/95 text-wyndell-ink placeholder:text-neutral-500"
                />
              </Field>
              <Field label="Email">
                <TextInput
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="border-white/25 bg-white/95 text-wyndell-ink placeholder:text-neutral-500"
                />
              </Field>
              {error ? (
                <p role="alert" className="text-sm text-wyndell-sun">
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="rounded-full px-7 shadow-lg shadow-black/20"
              >
                {submitting ? 'Subscribing…' : 'Subscribe'}
              </Button>
              <p className="text-xs text-white/60">
                No spam — just the good stuff. Unsubscribe anytime.
              </p>
            </form>
          )}
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
