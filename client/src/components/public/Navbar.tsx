import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDownIcon, MenuIcon, XIcon } from 'lucide-react'
import { fetchBranches } from '../../api/branches'
import type { Branch } from '../../lib/types'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { BrandLogo } from './Brand'

const NAV_LINKS: { to: string; label: string }[] = [
  { to: '/', label: 'Home' },
  { to: '/menu', label: 'Menu' },
  { to: '/reserve', label: 'Reservations' },
  { to: '/contact', label: 'Contact' },
]

export function PublicNavbar() {
  const [open, setOpen] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchesOpen, setBranchesOpen] = useState(false)
  const [mobileBranchesOpen, setMobileBranchesOpen] = useState(false)
  const location = useLocation()
  const branchesActive = location.pathname === '/branches' || location.pathname.startsWith('/branches/')

  useEffect(() => {
    void fetchBranches()
      .then(setBranches)
      .catch(() => {})
  }, [])
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
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBranchesOpen(!branchesOpen)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setBranchesOpen(false)
                  }
                }}
                aria-haspopup="true"
                aria-expanded={branchesOpen}
                aria-label="Branches"
                className={cn(
                  'px-3 text-foreground hover:text-foreground',
                  branchesActive &&
                    'bg-wyndell-orange/15 text-wyndell-orange-dark hover:bg-wyndell-orange/15 hover:text-wyndell-orange-dark'
                )}
              >
                Branches
                <ChevronDownIcon className="size-3 opacity-70" />
              </Button>
              {branchesOpen ? (
                <>
                  <button
                    type="button"
                    aria-hidden
                    tabIndex={-1}
                    onClick={() => setBranchesOpen(false)}
                    className="fixed inset-0 z-30 cursor-default bg-transparent"
                  />
                  <div className="absolute left-0 top-full z-40 mt-1 w-64 rounded-xl border border-wyndell-cream-dark bg-white p-2 shadow-lg">
                    {branches.map((branch) => (
                      <Link
                        key={branch._id}
                        to={`/branches/${branch.code}`}
                        onClick={() => setBranchesOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm text-wyndell-ink hover:bg-wyndell-cream-dark/60"
                      >
                        <span className="block font-medium text-wyndell-forest">{branch.name}</span>
                        <span className="block text-xs text-neutral-500">{branch.city || branch.address}</span>
                      </Link>
                    ))}
                    <div className="my-1.5 border-t border-wyndell-cream-dark" />
                    <Link
                      to="/branches"
                      onClick={() => setBranchesOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-wyndell-green-dark hover:bg-wyndell-cream-dark/60"
                    >
                      All branches →
                    </Link>
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/check">Check Reservation</Link>
            </Button>
            <Button asChild>
              <Link to="/reserve">Book a Reservation</Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setOpen(!open)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="lg:hidden"
            >
              {open ? <XIcon /> : <MenuIcon />}
            </Button>
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
            <div>
              <button
                type="button"
                onClick={() => setMobileBranchesOpen(!mobileBranchesOpen)}
                aria-expanded={mobileBranchesOpen}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-wyndell-ink hover:bg-wyndell-cream-dark/60"
              >
                Branches
                <span aria-hidden className="text-xs">{mobileBranchesOpen ? '▴' : '▾'}</span>
              </button>
              {mobileBranchesOpen ? (
                <div className="flex flex-col gap-1 pl-4">
                  {branches.map((branch) => (
                    <NavLink
                      key={branch._id}
                      to={`/branches/${branch.code}`}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        [
                          'rounded-lg px-3 py-2 text-sm font-medium',
                          isActive ? 'bg-wyndell-orange/15 text-wyndell-orange-dark' : 'text-wyndell-ink hover:bg-wyndell-cream-dark/60',
                        ].join(' ')
                      }
                    >
                      {branch.name}
                    </NavLink>
                  ))}
                  <NavLink
                    to="/branches"
                    end
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      [
                        'rounded-lg px-3 py-2 text-sm font-medium',
                        isActive ? 'bg-wyndell-orange/15 text-wyndell-orange-dark' : 'text-wyndell-ink hover:bg-wyndell-cream-dark/60',
                      ].join(' ')
                    }
                  >
                    All branches
                  </NavLink>
                </div>
              ) : null}
            </div>
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