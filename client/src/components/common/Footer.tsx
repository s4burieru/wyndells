import { Link } from 'react-router-dom'
import { BrandLogo } from '@/components/common/Brand'

export function PublicFooter() {
  return (
    <footer className="relative mt-8 overflow-hidden bg-wyndell-bark text-wyndell-cream/80">
      <div aria-hidden className="h-0.5 bg-wyndell-orange" />
      <div className="container-wyndell relative">
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandLogo className="h-16 w-auto" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-wyndell-cream/40">
              Warm, natural, home-style dining across Rizal and Metro Manila. Fresh food, garden
              spaces, and tables that feel like family.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Wyndell's on Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-wyndell-cream/10 text-wyndell-cream/80 transition-colors hover:bg-wyndell-orange hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.3 0-1.1-.1-2.1-.1-2.1 0-3.6 1.3-3.6 3.7V11H8.2v3h2.5v7h2.8Z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Wyndell's on Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-wyndell-cream/10 text-wyndell-cream/80 transition-colors hover:bg-wyndell-orange hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
                  <circle cx="12" cy="12" r="3.8" />
                  <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Wyndell's on TikTok"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-wyndell-cream/10 text-wyndell-cream/80 transition-colors hover:bg-wyndell-orange hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M16.8 4c.3 1.7 1.4 3 3.2 3.2v2.7c-1.2 0-2.3-.4-3.2-1v5.6a5.4 5.4 0 1 1-5.4-5.4c.3 0 .6 0 .9.1v2.8a2.6 2.6 0 1 0 1.8 2.5V4h2.7Z" />
                </svg>
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-[0.18em] text-wyndell-amber uppercase">Explore</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/menu" className="text-wyndell-cream/80 transition-colors hover:text-wyndell-amber">Digital Menu</Link></li>
              <li><Link to="/branches" className="text-wyndell-cream/80 transition-colors hover:text-wyndell-amber">Our Branches</Link></li>
              <li><Link to="/reserve" className="text-wyndell-cream/80 transition-colors hover:text-wyndell-amber">Book a Reservation</Link></li>
              <li><Link to="/check" className="text-wyndell-cream/80 transition-colors hover:text-wyndell-amber">Check Reservation</Link></li>
              <li><Link to="/feedback" className="text-wyndell-cream/80 transition-colors hover:text-wyndell-amber">Share Feedback</Link></li>
              <li><Link to="/careers" className="text-wyndell-cream/80 transition-colors hover:text-wyndell-amber">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-[0.18em] text-wyndell-amber uppercase">Branches</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-wyndell-cream/80">
              {/* Keep in sync with BRANCH_DATA in server/src/db/seed.ts. */}
              <li>Wyndell&rsquo;s Al Fresco</li>
              <li>Wyndell&rsquo;s at The Perch Highland Park</li>
              <li>Wyndell&rsquo;s Town</li>
              <li>Wyndell&rsquo;s Masinag</li>
              <li>Wyndell&rsquo;s Arca South</li>
              <li>Wyndell&rsquo;s Bed and Breakfast</li>
              <li>Wyndell&rsquo;s Farm</li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-[0.18em] text-wyndell-amber uppercase">Find us</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-wyndell-cream/80">
              <li>Rizal &amp; Metro Manila, Philippines</li>
              <li>Opening hours vary by branch</li>
              <li>
                <Link
                  to="/staff/login"
                  className="font-medium text-wyndell-cream underline-offset-4 transition-colors hover:text-wyndell-amber hover:underline"
                >
                  Staff sign in
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-2 border-t border-wyndell-cream/10 py-5 text-xs text-wyndell-cream/40 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Wyndell&rsquo;s. All rights reserved.</p>
          <p>Warm, natural, home-style dining.</p>
        </div>
      </div>
    </footer>
  )
}