import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArmchairIcon,
  CalendarCheckIcon,
  ChartColumnIcon,
  ExternalLinkIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  UsersIcon,
  UtensilsCrossedIcon,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { useAuth } from '../../lib/auth'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '../ui/sidebar'
import { BrandMark, Wordmark } from '../public/Brand'

type NavItem = {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/staff', label: 'Dashboard', icon: LayoutDashboardIcon, end: true },
  { to: '/staff/reservations', label: 'Reservations', icon: CalendarCheckIcon },
  { to: '/staff/tables', label: 'Tables', icon: ArmchairIcon },
  { to: '/staff/menu', label: 'Menu', icon: UtensilsCrossedIcon },
  { to: '/staff/feedback', label: 'Feedback', icon: MessageSquareTextIcon },
  { to: '/staff/reports', label: 'Reports', icon: ChartColumnIcon },
  { to: '/staff/branches', label: 'Branches', icon: MapPinIcon, adminOnly: true },
  { to: '/staff/users', label: 'Users & Managers', icon: UsersIcon, adminOnly: true },
]

export function DashboardLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isAdmin = user?.role === 'admin'

  if (!user) {
    return null
  }

  const handleSignOut = () => {
    signOut()
    navigate('/')
  }

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)
  const isActive = (item: NavItem) =>
    item.end === true ? pathname === item.to : pathname.startsWith(item.to)

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild tooltip="Wyndell's staff portal">
                <Link to="/staff">
                  <BrandMark className="size-8" />
                  <div className="grid flex-1 text-left leading-tight">
                    <Wordmark />
                    <span className="truncate text-xs text-muted-foreground">Staff portal</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive(item)} tooltip={item.label}>
                      <NavLink to={item.to} end={item.end === true}>
                        <item.icon />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 shrink-0 rounded-full bg-wyndell-green" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{user.name}</span>
              <Badge variant="secondary">{isAdmin ? 'Administrator' : 'Manager'}</Badge>
            </div>
            <div className="flex items-center justify-between gap-1">
              <Button asChild variant="ghost" size="xs" className="text-muted-foreground">
                <Link to="/">
                  <ExternalLinkIcon />
                  Public site
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className="text-destructive hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOutIcon />
                Sign out
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hidden text-destructive group-data-[collapsible=icon]:flex hover:text-destructive"
            onClick={handleSignOut}
            aria-label="Sign out"
          >
            <LogOutIcon />
          </Button>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 !h-4" />
          <span className="truncate text-sm font-medium text-muted-foreground">
            Wyndell&rsquo;s · Staff portal
          </span>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
