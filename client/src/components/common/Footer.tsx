import { Link } from 'react-router-dom'
import { BrandLogo } from '@/components/common/Brand'

export function PublicFooter() {
  return (
    <footer className="relative mt-8 overflow-hidden bg-wyndell-bark text-white/80">
      <div aria-hidden className="h-1 bg-wyndell-amber" />
      <div className="container-wyndell relative">
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandLogo className="h-16 w-auto" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              Warm, natural, home-style dining across Rizal and Metro Manila. Fresh food, garden
              spaces, and tables that feel like family.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-[0.18em] text-wyndell-amber uppercase">Explore</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/menu" className="text-white/70 transition-colors hover:text-wyndell-amber">Digital Menu</Link></li>
              <li><Link to="/branches" className="text-white/70 transition-colors hover:text-wyndell-amber">Our Branches</Link></li>
              <li><Link to="/reserve" className="text-white/70 transition-colors hover:text-wyndell-amber">Book a Reservation</Link></li>
              <li><Link to="/check" className="text-white/70 transition-colors hover:text-wyndell-amber">Check Reservation</Link></li>
              <li><Link to="/feedback" className="text-white/70 transition-colors hover:text-wyndell-amber">Share Feedback</Link></li>
              <li><Link to="/careers" className="text-white/70 transition-colors hover:text-wyndell-amber">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-[0.18em] text-wyndell-amber uppercase">Branches</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
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
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
              <li>Rizal &amp; Metro Manila, Philippines</li>
              <li>Opening hours vary by branch</li>
              <li>
                <Link
                  to="/staff/login"
                  className="font-medium text-white underline-offset-4 transition-colors hover:text-wyndell-amber hover:underline"
                >
                  Staff sign in
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-2 border-t border-white/10 py-5 text-xs text-white/50 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Wyndell&rsquo;s. All rights reserved.</p>
          <p>Warm, natural, home-style dining.</p>
        </div>
      </div>
    </footer>
  )
}