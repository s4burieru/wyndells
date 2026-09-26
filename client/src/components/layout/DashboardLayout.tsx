import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArmchairIcon,
  BriefcaseBusinessIcon,
  CalendarCheckIcon,
  ChartColumnIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  MessagesSquareIcon,
  UsersIcon,
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
import { BrandMark, Wordmark } from '@/components/common/Brand'
import { NotificationBell } from '@/features/notifications/components'
import { AccountMenu } from '@/features/users/components/AccountMenu'
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
  { to: '/staff/chat', label: 'Chat', icon: MessagesSquareIcon },
  { to: '/staff/branches', label: 'Branches', icon: MapPinIcon, adminOnly: true },
  { to: '/staff/users', label: 'Users & Managers', icon: UsersIcon, adminOnly: true },
  { to: '/staff/activity', label: 'Activity', icon: HistoryIcon, adminOnly: true },
]

export function DashboardLayout() {
  const { user, signOut, updateUser } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const [editingSelf, setEditingSelf] = useState(false)
  // Keeps the shared chat socket alive and the unread count current.
  const chatUnread = useChatBadge(user !== null)

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
                {items.map((item) => {
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
        </SidebarContent>

        <SidebarFooter>
          <AccountMenu
            user={user}
            onViewProfile={() => setProfileOpen(true)}
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
            Wyndell&rsquo;s · Staff portal
          </span>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
          </div>
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
