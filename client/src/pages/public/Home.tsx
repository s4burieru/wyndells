import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBranches } from '../../api/branches'
import { fetchMenuItems } from '../../api/menu'
import { fetchPublicFeedback } from '../../api/feedback'
import type { Branch, FeedbackSummary, MenuItem } from '../../lib/types'
import { formatPrice } from '../../lib/format'
import { Badge } from '../../components/ui/display'
import { StarRating } from '../../components/ui/badges'

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
          <p className="text-sm font-medium text-wyndell-green-dark">
            Al fresco dining · Garden grills · Home-style Filipino food
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-wyndell-forest sm:text-5xl">
            Fresh. Natural. Warm.
            <br />
            <span className="text-wyndell-orange-dark">This is Wyndell&rsquo;s.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-wyndell-ink">
            Four garden branches across Rizal serving charcoal-grilled favourites,
            seasonal freshness, and tables made for sharing.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/reserve"
              className="rounded-xl bg-wyndell-orange px-6 py-3 text-base font-semibold text-white shadow-md hover:bg-wyndell-orange-dark"
            >
              Book a Reservation
            </Link>
            <Link
              to="/menu"
              className="rounded-xl border border-wyndell-green-dark/30 bg-white/70 px-6 py-3 text-base font-semibold text-wyndell-green-dark hover:bg-white"
            >
              Browse the Menu
            </Link>
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
        <h2 className="font-display text-3xl font-bold text-wyndell-forest">Rooted in Rizal, grown for family</h2>
        <p className="mt-5 text-lg leading-relaxed text-wyndell-ink">
          Wyndell&rsquo;s started as a single al fresco kitchen in Sampaloc, Tanay — a small garden where
          neighbours gathered around the grill. Today our branches in Sampaloc, Bayan, Antipolo, and Masinag
          share the same promise: ingredients dialed toward fresh, plates full of warmth, and a setting that
          always feels like outdoors.
        </p>
      </div>
    </section>
  )
}

function BranchesSection({ branches, loaded }: { branches: Branch[]; loaded: boolean }) {
  return (
    <section className="container-wyndell py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-wyndell-forest">Our branches</h2>
        <Link to="/branches" className="text-sm font-medium text-wyndell-orange-dark hover:underline">
          View all branches →
        </Link>
      </div>
      {!loaded ? <p className="mt-6 text-sm text-neutral-500">Loading branches…</p> : null}
      {loaded && branches.length === 0 ? <p className="mt-6 text-sm text-neutral-500">No branches published yet.</p> : null}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {branches.slice(0, 4).map((branch) => (
          <Link
            key={branch._id}
            to={`/branches/${branch.code}`}
            className="rounded-2xl border border-wyndell-cream-dark bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-wyndell-orange/10 text-sm font-bold text-wyndell-orange-dark">
              {(branch.name || 'W').charAt(0)}
            </span>
            <h3 className="mt-3 font-semibold text-wyndell-forest">{branch.name}</h3>
            <p className="mt-1 text-xs text-neutral-500">{branch.city ?? branch.address}</p>
            <p className="mt-2 text-xs font-medium text-wyndell-green-dark">{branch.hours}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

function FeaturedMenuSection({ items, loaded }: { items: MenuItem[]; loaded: boolean }) {
  return (
    <section className="container-wyndell py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-wyndell-forest">Featured from the grill</h2>
        <Link to="/menu" className="text-sm font-medium text-wyndell-orange-dark hover:underline">
          See the full menu →
        </Link>
      </div>
      {!loaded ? <p className="mt-6 text-sm text-neutral-500">Loading menu…</p> : null}
      {loaded && items.length === 0 ? <p className="mt-6 text-sm text-neutral-500">No featured dishes yet.</p> : null}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item._id} className="rounded-2xl border border-wyndell-cream-dark bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-wyndell-forest">{item.name}</h3>
              <span className="rounded-full bg-wyndell-green/10 px-2.5 py-0.5 text-xs font-semibold text-wyndell-green-dark">
                {formatPrice(item.price)}
              </span>
            </div>
            <p className="mt-2 text-sm text-neutral-500">{item.description}</p>
            <div className="mt-2">
              <Badge className="bg-wyndell-cream-dark/60 text-wyndell-ink">{item.category}</Badge>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ReviewsSection({ reviews, loaded }: { reviews: FeedbackSummary[]; loaded: boolean }) {
  return (
    <section className="container-wyndell py-16">
      <h2 className="font-display text-2xl font-bold text-wyndell-forest">What our guests say</h2>
      {!loaded ? <p className="mt-6 text-sm text-neutral-500">Loading reviews…</p> : null}
      {loaded && reviews.length === 0 ? <p className="mt-6 text-sm text-neutral-500">Be the first to leave a review.</p> : null}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <figure key={review._id} className="rounded-2xl border border-wyndell-cream-dark bg-white p-5 shadow-sm">
            <StarRating value={review.rating} size="sm" />
            <blockquote className="mt-3 text-sm leading-relaxed text-wyndell-ink">
              &ldquo;{review.comment}&rdquo;
            </blockquote>
            <figcaption className="mt-3 text-xs font-medium text-neutral-500">
              — {review.customerName} · {review.branch?.name}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

function ReservationCtaSection() {
  return (
    <section className="container-wyndell py-16">
      <div className="rounded-3xl bg-linear-to-r from-wyndell-orange/15 via-wyndell-cream to-wyndell-green/10 p-8 sm:p-12">
        <h2 className="font-display text-3xl font-bold text-wyndell-forest">Plan your visit</h2>
        <p className="mt-3 max-w-2xl text-wyndell-ink">
          Reserve a table online in under a minute — no account needed. Pick a branch, a time that suits you,
          and we&rsquo;ll have the grill ready.
        </p>
        <Link
          to="/reserve"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-wyndell-orange px-6 py-3 text-base font-semibold text-white shadow-md hover:bg-wyndell-orange-dark"
        >
          Book a Reservation
        </Link>
      </div>
    </section>
  )
}

function ContactTeaserSection() {
  return (
    <section className="container-wyndell py-16">
      <h2 className="font-display text-2xl font-bold text-wyndell-forest">Reach us</h2>
      <p className="mt-3 text-wyndell-ink">
        Questions, large groups, or feedback? Find a branch&rsquo;s contact details on our{' '}
        <Link to="/branches" className="font-medium text-wyndell-orange-dark hover:underline">branches page</Link>, or visit our{' '}
        <Link to="/contact" className="font-medium text-wyndell-orange-dark hover:underline">contact page</Link>.
      </p>
    </section>
  )
}