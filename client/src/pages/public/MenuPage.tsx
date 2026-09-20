import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, CalendarCheck, Search, UtensilsCrossed } from 'lucide-react'
import { fetchBranches } from '../../api/branches'
import { fetchMenuItems } from '../../api/menu'
import type { Branch, MenuCategory, MenuItem } from '../../lib/types'
import { formatPrice, MENU_CATEGORIES } from '../../lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, ErrorState, PageHeader } from '../../components/ui/display'

export function MenuPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [items, setItems] = useState<MenuItem[]>([])
  const [category, setCategory] = useState<MenuCategory | 'All'>('All')
  const [query, setQuery] = useState('')
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
  const visibleItems = items.filter((item) => {
    const matchesCategory = category === 'All' || item.category === category
    const needle = query.trim().toLowerCase()
    return matchesCategory && (!needle || item.name.toLowerCase().includes(needle) || item.description.toLowerCase().includes(needle))
  })

  return (
    <div className="container-wyndell py-8">
      <PageHeader
        title="Wyndell's menu"
        subtitle="Scan at the table or browse here. No account needed — the menu is always open."
        action={
          selectedBranch ? (
            <Button asChild className="bg-wyndell-orange text-white hover:bg-wyndell-orange-dark">
              <Link to={`/reserve?branch=${selectedBranch}`}>
                <CalendarCheck />
                Reserve at this branch
              </Link>
            </Button>
          ) : undefined
        }
      />

      <Card className="mt-6">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-end">
          <div className="grid w-full gap-2 sm:max-w-xs">
            <Label htmlFor="menu-branch">Branch</Label>
            <Select value={selectedBranch || undefined} onValueChange={(value) => setSelectedBranch(value)}>
              <SelectTrigger id="menu-branch" className="w-full">
                <SelectValue placeholder="Choose a branch…" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch._id} value={branch._id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid w-full gap-2 sm:max-w-sm">
            <Label htmlFor="menu-search">Search dishes</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="menu-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search sisig, halo-halo…"
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <Card key={key}>
              <CardHeader>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="mt-8"><ErrorState message="Unable to load the menu right now." /></div>
      ) : !selectedBranch ? (
        <Card className="mt-10 border-dashed text-center">
          <CardHeader>
            <UtensilsCrossed className="mx-auto size-8 text-wyndell-orange-dark" aria-hidden />
            <CardTitle className="text-wyndell-forest">Choose a branch to view its menu</CardTitle>
            <CardDescription>Each branch serves garden favourites plus specials.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Tabs value={category} onValueChange={(value) => setCategory(value as MenuCategory | 'All')} className="mt-6">
            <TabsList className="h-auto flex-wrap justify-start">
              {categories.map((value) => (
                <TabsTrigger key={value} value={value}>
                  {value}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item) => <MenuItemCard key={item._id} item={item} />)}
          </div>

          {visibleItems.length === 0 ? (
            <div className="mt-10">
              <EmptyState title="No dishes match this filter" message="Try another category or clear your search." />
            </div>
          ) : null}
          <div className="mt-6 flex justify-center">
            <Button asChild variant="link" className="text-wyndell-orange-dark">
              <Link to={selectedBranch ? `/reserve?branch=${selectedBranch}` : '/reserve'}>
                Hungry? Book a table
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function MenuItemCard({ item }: { item: MenuItem }) {
  const unavailable = item.status === 'unavailable'
  return (
    <Card className={unavailable ? 'opacity-70' : undefined}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-wyndell-forest">{item.name}</CardTitle>
            <CardDescription>{item.category}</CardDescription>
          </div>
          {unavailable ? (
            <Badge variant="destructive">Unavailable</Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0 bg-wyndell-green/15 text-wyndell-green-dark hover:bg-wyndell-green/20">
              {formatPrice(item.price)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
      </CardContent>
    </Card>
  )
}