import { Link } from 'react-router-dom'
import { BrandLogo } from '@/components/common/Brand'

export function PublicFooter() {
  return (
    <footer className="border-t border-wyndell-cream-dark/70 bg-wyndell-cream">
      <div className="container-wyndell">
        <div className="grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandLogo />
            <p className="mt-3 text-sm leading-relaxed text-wyndell-ink">
              Warm, natural, home-style dining across Rizal and Metro Manila. Fresh food, garden
              spaces, and tables that feel like family.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-wyndell-forest">Explore</h3>
            <ul className="mt-3 space-y-2 text-sm text-wyndell-ink">
              <li><Link to="/menu" className="hover:text-wyndell-orange-dark">Digital Menu</Link></li>
              <li><Link to="/branches" className="hover:text-wyndell-orange-dark">Our Branches</Link></li>
              <li><Link to="/reserve" className="hover:text-wyndell-orange-dark">Book a Reservation</Link></li>
              <li><Link to="/check" className="hover:text-wyndell-orange-dark">Check Reservation</Link></li>
              <li><Link to="/feedback" className="hover:text-wyndell-orange-dark">Share Feedback</Link></li>
              <li><Link to="/careers" className="hover:text-wyndell-orange-dark">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-wyndell-forest">Branches</h3>
            <ul className="mt-3 space-y-2 text-sm text-wyndell-ink">
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
            <h3 className="text-sm font-semibold text-wyndell-forest">Find us</h3>
            <ul className="mt-3 space-y-2 text-sm text-wyndell-ink">
              <li>Rizal &amp; Metro Manila, Philippines</li>
              <li>Opening hours vary by branch</li>
              <li>
                <Link to="/staff/login" className="font-medium text-wyndell-green-dark hover:underline">
                  Staff sign in
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="border-t border-wyndell-cream-dark/70 py-4 text-center text-xs text-neutral-500">
          &copy; {new Date().getFullYear()} Wyndell&rsquo;s. All rights reserved.
        </p>
      </div>
    </footer>
  )
}