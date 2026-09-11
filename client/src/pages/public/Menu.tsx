import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchBranches } from '../../api/branches'
import { fetchMenuItems } from '../../api/menu'
import type {  Branch, MenuCategory, MenuItem  } from '../../lib/types'
import { formatPrice, MENU_CATEGORIES } from '../../lib/format'
import { Badge, ErrorState, Spinner } from '../../components/ui/display'

export function MenuPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [items, setItems] = useState<MenuItem[]>([])
  const [category, setCategory] = useState<MenuCategory | 'All'>('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [searchParams] = useSearchParams()
  const initialBranch = searchParams.get('branch') ?? ''

  useEffect(() => {
    void fetchBranches()
      .then((branchList) => {
        setBranches(branchList)
        setSelectedBranch(initialBranch && branchList.some((b) => b._id === initialBranch) ? initialBranch : '')
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [initialBranch])

  useEffect(() => {
    if (!selectedBranch) {
      setItems([])
      return
    }
    setLoading(true)
    setError(false)
    void fetchMenuItems({ branch: selectedBranch })
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [selectedBranch])

  const categories: (MenuCategory | 'All')[] = ['All', ...MENU_CATEGORIES]
  const visibleItems = category === 'All' ? items : items.filter((item) => item.category === category)

  return (
    <div className="container-wyndell py-8">
      <h1 className="font-display text-3xl font-bold text-wyndell-forest">Wyndell&rsquo;s menu</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Scan at the table or browse here. No account needed — the menu is always open.
      </p>

      <div className="mt-5 flex items-center gap-2 overflow-x-auto rounded-xl border border-wyndell-cream-dark bg-white p-2">
        <label htmlFor="menu-branch" className="sr-only">
          Choose branch
        </label>
        <select
          id="menu-branch"
          value={selectedBranch}
          onChange={(event) => setSelectedBranch(event.target.value)}
          className="min-w-52 rounded-lg border border-wyndell-ink/20 bg-white px-3 py-2 text-sm focus:border-wyndell-orange"
        >
          <option value="">Choose a branch…</option>
          {branches.map((branch) => (
            <option key={branch._id} value={branch._id}>
              {branch.name}
            </option>
          ))}
        </select>
        {selectedBranch ? (
          <Link
            to={`/reserve?branch=${selectedBranch}`}
            className="ml-auto shrink-0 rounded-lg bg-wyndell-orange px-3 py-2 text-sm font-semibold text-white hover:bg-wyndell-orange-dark"
          >
            Reserve at this branch
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-8"><Spinner label="Loading menu…" /></div>
      ) : error ? (
        <div className="mt-8"><ErrorState message="Unable to load the menu right now." /></div>
      ) : !selectedBranch ? (
        <div className="mt-10 rounded-2xl border border-dashed border-wyndell-cream-dark bg-white p-8 text-center">
          <p className="text-base font-semibold text-wyndell-ink">Choose a branch to view its menu</p>
          <p className="mt-1 text-sm text-neutral-500">Each Wyndell&rsquo;s branch serves the same garden favourites with branch-specific specials.</p>
        </div>
      ) : (
        <>
          <nav aria-label="Menu categories" className="mt-4 flex flex-wrap gap-2">
            {categories.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={[
                  'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  category === value ? 'bg-wyndell-orange text-white' : 'bg-white text-wyndell-ink border border-wyndell-cream-dark hover:bg-wyndell-cream-dark/60',
                ].join(' ')}
              >
                {value}
              </button>
            ))}
          </nav>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item) => <MenuItemCard key={item._id} item={item} />)}
          </div>

          {visibleItems.length === 0 ? (
            <p className="mt-10 text-center text-sm text-neutral-500">No items in this category yet.</p>
          ) : null}
        </>
      )}
    </div>
  )
}

function MenuItemCard({ item }: { item: MenuItem }) {
  const unavailable = item.status === 'unavailable'
  return (
    <article className={['rounded-2xl border bg-white p-4 shadow-sm', unavailable ? 'border-red-200 opacity-70' : 'border-wyndell-cream-dark'].join(' ')}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-wyndell-forest">{item.name}</h2>
          <p className="mt-0.5 text-xs font-medium text-neutral-500">{item.category}</p>
        </div>
        {unavailable ? (
          <Badge className="bg-red-100 text-red-700">Unavailable</Badge>
        ) : (
          <span className="shrink-0 rounded-full bg-wyndell-green/10 px-2.5 py-1 text-xs font-bold text-wyndell-green-dark">
            {formatPrice(item.price)}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">{item.description}</p>
    </article>
  )
}