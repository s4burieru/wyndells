import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArmchairIcon,
  BriefcaseBusinessIcon,
  CalendarCheckIcon,
  ChartColumnIcon,
  ExternalLinkIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  UserIcon,
  UsersIcon,
  UtensilsCrossedIcon,
} from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { toast } from 'sonner'
import { updateProfile } from '@/services/api/auth'
import { useAuth } from '@/contexts/AuthContext'
import { friendlyError, roleLabel } from '@/utils/format'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
} from '@/components/ui/sidebar'
import { BrandMark, Wordmark } from '@/components/common/Brand'
import { UserAvatar } from '@/components/common/UserAvatar'
import { UserFormModal } from '@/features/users/components/UserFormModal'
import { UserProfileSheet } from '@/features/users/components/UserProfileSheet'

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
  { to: '/staff/applications', label: 'Careers', icon: BriefcaseBusinessIcon },
  { to: '/staff/reports', label: 'Reports', icon: ChartColumnIcon },
  { to: '/staff/branches', label: 'Branches', icon: MapPinIcon, adminOnly: true },
  { to: '/staff/users', label: 'Users & Managers', icon: UsersIcon, adminOnly: true },
]

export function DashboardLayout() {
  const { user, signOut, updateUser } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const [editingSelf, setEditingSelf] = useState(false)

  if (!user) {
    return null
  }

  const isAdmin = user.role === 'admin'

  const handleSignOut = () => {
    signOut()
    navigate('/')
  }

  const handleProfileSave = (payload: Record<string, unknown> | FormData) => {
    void updateProfile(payload)
      .then((updated) => {
        updateUser(updated)
        setEditingSelf(false)
        toast.success('Your profile has been updated.')
      })
      .catch((reason: unknown) => toast.error(friendlyError(reason)))
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
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex w-full items-center gap-2 rounded-md p-1 text-left transition-colors hover:bg-accent group-data-[collapsible=icon]:hidden"
          >
            <UserAvatar name={user.name} src={user.avatarUrl} role={user.role} size="xs" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-foreground">
                {user.name}
              </span>
              <span className="block truncate text-[0.7rem] text-muted-foreground">
                {user.position || roleLabel(user.role)}
              </span>
            </span>
          </button>

          <div className="flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center justify-between gap-1">
              <Button
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                onClick={() => setProfileOpen(true)}
              >
                <UserIcon />
                My profile
              </Button>
              <Button asChild variant="ghost" size="xs" className="text-muted-foreground">
                <Link to="/">
                  <ExternalLinkIcon />
                  Public site
                </Link>
              </Button>
            </div>
            <Button
              variant="ghost"
              size="xs"
              className="justify-start text-destructive hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOutIcon />
              Sign out
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="hidden justify-center group-data-[collapsible=icon]:flex"
            aria-label="My profile"
          >
            <UserAvatar name={user.name} src={user.avatarUrl} role={user.role} size="xs" />
          </button>
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
          <Separator orientation="vertical" className="mr-2 h-4!" />
          <span className="truncate text-sm font-medium text-muted-foreground">
            Wyndell&rsquo;s · Staff portal
          </span>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </SidebarInset>

      <UserProfileSheet
        user={user}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onEdit={() => {
          setProfileOpen(false)
          setEditingSelf(true)
        }}
      />

      {editingSelf ? (
        <UserFormModal
          user={user}
          self
          onClose={() => setEditingSelf(false)}
          onSave={handleProfileSave}
        />
      ) : null}
    </SidebarProvider>
  )
}
