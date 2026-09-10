import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { BrandLogo } from './Brand'

const NAV_LINKS: { to: string; label: string }[] = [
  { to: '/', label: 'Home' },
  { to: '/menu', label: 'Menu' },
  { to: '/branches', label: 'Branches' },
  { to: '/reserve', label: 'Reservations' },
  { to: '/contact', label: 'Contact' },
]

export function PublicNavbar() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 border-b border-wyndell-cream-dark/70 bg-wyndell-sand/95 backdrop-blur-sm">
      <div className="container-wyndell">
        <nav className="flex items-center justify-between gap-4 py-3" aria-label="Main">
          <BrandLogo />
          <div className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  [
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-wyndell-orange/15 text-wyndell-orange-dark' : 'text-wyndell-ink hover:bg-wyndell-cream-dark/60',
                  ].join(' ')
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/check"
              className="hidden rounded-lg border border-wyndell-ink/20 px-3 py-2 text-sm font-medium text-wyndell-ink hover:bg-wyndell-cream-dark sm:inline-flex"
            >
              Check Reservation
            </Link>
            <Link
              to="/reserve"
              className="rounded-lg bg-wyndell-orange px-4 py-2 text-sm font-semibold text-white hover:bg-wyndell-orange-dark"
            >
              Book a Reservation
            </Link>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="rounded-lg border border-wyndell-ink/20 p-2 text-sm text-wyndell-ink lg:hidden"
            >
              {open ? '✕' : '☰'}
            </button>
          </div>
        </nav>
        {open ? (
          <nav className="lg:hidden flex flex-col gap-1 border-t border-wyndell-cream-dark/70 py-2" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  [
                    'rounded-lg px-3 py-2 text-sm font-medium',
                    isActive ? 'bg-wyndell-orange/15 text-wyndell-orange-dark' : 'text-wyndell-ink hover:bg-wyndell-cream-dark/60',
                  ].join(' ')
                }
              >
                {link.label}
              </NavLink>
            ))}
            <NavLink
              to="/check"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-wyndell-ink hover:bg-wyndell-cream-dark/60"
            >
              Check Reservation
            </NavLink>
            <Link
              to="/staff/login"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-wyndell-ink hover:bg-wyndell-cream-dark/60"
            >
              Staff Sign in
            </Link>
          </nav>
        ) : null}
      </div>
    </header>
  )
}