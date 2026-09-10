import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { BrandMark, Wordmark } from '../public/Brand'

type NavItem = { to: string; label: string; end?: boolean; adminOnly?: boolean }

const NAV_ITEMS: NavItem[] = [
  { to: '/staff', label: 'Dashboard', end: true },
  { to: '/staff/reservations', label: 'Reservations' },
  { to: '/staff/tables', label: 'Tables' },
  { to: '/staff/menu', label: 'Menu' },
  { to: '/staff/feedback', label: 'Feedback' },
  { to: '/staff/reports', label: 'Reports' },
  { to: '/staff/branches', label: 'Branches', adminOnly: true },
  { to: '/staff/users', label: 'Users & Managers', adminOnly: true },
]

export function DashboardLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const isAdmin = user?.role === 'admin'

  if (!user) {
    return null
  }

  const handleSignOut = () => {
    signOut()
    navigate('/')
  }

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="hidden w-64 border-r border-wyndell-cream-dark/70 bg-wyndell-cream lg:flex lg:flex-col lg:py-6">
        <div className="mb-6 flex items-center gap-2">
          <BrandMark />
          <Wordmark />
        </div>
        <p className="mb-1 px-3 text-[11px] uppercase tracking-wide text-neutral-400">Staff portal</p>
        <div className="flex items-center gap-1.5 px-3">
          <span className="flex h-2 w-2 shrink-0 rounded-full bg-wyndell-green" />
          <span className="text-xs font-medium text-wyndell-ink">
            {user.name} · {isAdmin ? 'Administrator' : 'Manager'}
          </span>
        </div>
        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end === true}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                [
                  'flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-wyndell-orange/15 text-wyndell-orange-dark'
                    : 'text-wyndell-ink hover:bg-wyndell-cream-dark/60',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-wyndell-cream-dark/70 px-3 py-3">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-xs text-wyndell-ink hover:text-wyndell-orange-dark">View public site</Link>
            <span className="text-neutral-300">·</span>
            <button type="button" onClick={handleSignOut} className="text-xs text-red-600 hover:text-red-800">
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Top bar + content */}
      <div className="flex-1">
        <header className="z-40 flex items-center justify-between gap-3 border-b border-wyndell-cream-dark/70 bg-wyndell-sand px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <BrandMark className="h-8 w-8" />
            <span className="text-sm font-semibold text-wyndell-ink">{user.name}</span>
          </div>
          <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" className="rounded-lg border border-wyndell-ink/20 p-2 text-sm text-wyndell-ink">
            {menuOpen ? '✕' : '☰'}
          </button>
        </header>
        {menuOpen ? (
          <nav className="space-y-1 rounded-xl border border-wyndell-cream-dark bg-white p-3">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end === true}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  [
                    'block rounded-lg px-3 py-2 text-sm font-medium',
                    isActive ? 'bg-wyndell-orange/15 text-wyndell-orange-dark' : 'text-wyndell-ink hover:bg-wyndell-cream-dark/60',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button type="button" onClick={handleSignOut} className="text-left text-sm text-red-600">Sign out</button>
          </nav>
        ) : null}
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}