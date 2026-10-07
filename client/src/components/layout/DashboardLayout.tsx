import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArmchairIcon,
  BriefcaseBusinessIcon,
  CalendarCheckIcon,
  ChartColumnIcon,
  ContactRoundIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  MegaphoneIcon,
  MessageSquareTextIcon,
  MessagesSquareIcon,
  ShieldCheckIcon,
  UsersIcon,
  UsersRoundIcon,
  UtensilsCrossedIcon,
} from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { toast } from 'sonner'
import { updateProfile } from '@/services/api/auth'
import { useAuth } from '@/contexts/AuthContext'
import { useChatBadge } from '@/hooks/useChatBadge'
import { friendlyError } from '@/utils/format'
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
import { NotificationBell } from '@/features/notifications/components'
import { AccountMenu } from '@/features/users/components/AccountMenu'
import { UserFormModal } from '@/features/users/components/UserFormModal'
import type { Permission } from '@/types'

type NavItem = {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
  /** Hidden unless the signed-in user's role holds this permission. */
  permission?: Permission
  /** Extra path prefixes that should light this item up (e.g. detail pages). */
  match?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/staff', label: 'Dashboard', icon: LayoutDashboardIcon, end: true },
  { to: '/staff/reservations', label: 'Reservations', icon: CalendarCheckIcon, permission: 'reservations.manage' },
  { to: '/staff/tables', label: 'Tables', icon: ArmchairIcon, permission: 'tables.manage' },
  { to: '/staff/menu', label: 'Menu', icon: UtensilsCrossedIcon, permission: 'menu.manage' },
  { to: '/staff/feedback', label: 'Feedback', icon: MessageSquareTextIcon, permission: 'feedback.view' },
  { to: '/staff/promotions', label: 'Promotions', icon: MegaphoneIcon, permission: 'promotions.manage' },
  { to: '/staff/customers', label: 'Customers', icon: ContactRoundIcon, permission: 'customers.view' },
  { to: '/staff/applications', label: 'Careers', icon: BriefcaseBusinessIcon, permission: 'careers.manage' },
  { to: '/staff/chat', label: 'Chat', icon: MessagesSquareIcon, permission: 'chat.use' },
  { to: '/staff/directory', label: 'Staff', icon: UsersRoundIcon, permission: 'directory.view', match: ['/staff/profile'] },
  { to: '/staff/reports', label: 'Reports', icon: ChartColumnIcon, permission: 'reports.view' },
  { to: '/staff/branches', label: 'Branches', icon: MapPinIcon, permission: 'branches.manage' },
  { to: '/staff/users', label: 'Users & Managers', icon: UsersIcon, permission: 'users.view' },
  { to: '/staff/activity', label: 'Activity', icon: HistoryIcon, permission: 'activity.view' },
  {
    to: '/staff/settings/roles',
    label: 'Roles & Permissions',
    icon: ShieldCheckIcon,
    permission: 'roles.manage',
    match: ['/staff/settings'],
  },
]

/** Groups nav items into logical sections for easier scanning. */
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [],
  },
  {
    label: 'Operations',
    items: [],
  },
  {
    label: 'Communication',
    items: [],
  },
  {
    label: 'Management',
    items: [],
  },
]

/** Maps each nav item to its group. */
const ITEM_GROUP_MAP: Record<string, string> = {
  '/staff': 'Overview',
  '/staff/reservations': 'Operations',
  '/staff/tables': 'Operations',
  '/staff/menu': 'Operations',
  '/staff/feedback': 'Operations',
  '/staff/promotions': 'Communication',
  '/staff/customers': 'Management',
  '/staff/applications': 'Operations',
  '/staff/chat': 'Communication',
  '/staff/directory': 'Communication',
  '/staff/reports': 'Management',
  '/staff/branches': 'Management',
  '/staff/users': 'Management',
  '/staff/activity': 'Management',
  '/staff/settings/roles': 'Management',
}

export function DashboardLayout() {
  const { user, signOut, updateUser, can } = useAuth()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const [editingSelf, setEditingSelf] = useState(false)
  // Keeps the shared chat socket alive and the unread count current — but only
  // for roles that still hold `chat.use`.
  const chatUnread = useChatBadge(user !== null && can('chat.use'))

  if (!user) {
    return null
  }

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

  const items = NAV_ITEMS.filter((item) => !item.permission || can(item.permission))
  const isActive = (item: NavItem) => {
    if (item.end === true) {
      return pathname === item.to
    }
    // Detail pages (e.g. a profile) keep their parent section highlighted.
    const viaMatch = item.match?.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
    return viaMatch === true || pathname.startsWith(item.to)
  }

  // Build groups with their filtered items
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: items.filter((item) => ITEM_GROUP_MAP[item.to] === group.label),
  })).filter((group) => group.items.length > 0)

  // The profile opens as a full page in the main content area; `from` lets it
  // route back to the exact page (and filter state) the user came from.
  const openOwnProfile = () => {
    navigate(`/staff/profile/${user.id}`, { state: { from: `${pathname}${search}` } })
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                asChild
                className="h-auto"
                tooltip="Wyndell's Operations Dashboard"
              >
                <Link to="/staff" aria-label="Wyndell's Operations Dashboard">
                  <img
                    src="/logos/wyndells-icon-logo.png"
                    alt=""
                    className="size-8 shrink-0 object-contain"
                  />
                  <div className="grid min-w-0 flex-1 content-center gap-0.5 overflow-hidden text-left leading-tight transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-0">
                    <img
                      src="/logos/wyndells-logo-text.png"
                      alt="Wyndell's"
                      className="h-auto w-full max-w-28.75 object-contain object-left"
                    />
                    <span className="truncate text-xs text-muted-foreground">Operations Dashboard</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {groups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const badge = item.to === '/staff/chat' ? chatUnread : 0
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item)}
                          tooltip={badge > 0 ? `${item.label} · ${badge} unread` : item.label}
                        >
                          <NavLink to={item.to} end={item.end === true}>
                            <item.icon />
                            <span>{item.label}</span>
                            {badge > 0 ? (
                              <span className="ml-auto inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[0.65rem] font-semibold text-primary-foreground group-data-[collapsible=icon]:hidden">
                                {badge > 99 ? '99+' : badge}
                              </span>
                            ) : null}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <AccountMenu
            user={user}
            onViewProfile={openOwnProfile}
            onEditProfile={() => setEditingSelf(true)}
            onSignOut={handleSignOut}
          />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4!" />
          <span className="truncate text-sm font-medium text-muted-foreground">
            Wyndell&rsquo;s · Operations Dashboard
          </span>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </SidebarInset>

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
