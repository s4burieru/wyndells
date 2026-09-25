import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArmchairIcon,
  BellIcon,
  BellOffIcon,
  BriefcaseBusinessIcon,
  CalendarCheckIcon,
  CheckCheckIcon,
  MessageSquareTextIcon,
  SparklesIcon,
  UserPlusIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/utils/cn'
import { friendlyError, timeAgo } from '@/utils/format'
import type { AppNotification, NotificationType } from '@/types'

/** One glyph per notification kind so the list is scannable at a glance. */
const TYPE_ICON: Record<NotificationType, typeof BellIcon> = {
  reservation_new: CalendarCheckIcon,
  reservation_status: CalendarCheckIcon,
  table_assigned: ArmchairIcon,
  feedback_new: MessageSquareTextIcon,
  application_new: BriefcaseBusinessIcon,
  application_status: BriefcaseBusinessIcon,
  staff_created: UserPlusIcon,
  welcome: SparklesIcon,
}

const EMPTY_MESSAGE = "You're all caught up."

/**
 * The staff notification bell for the dashboard header. Polls through
 * {@link useNotifications} and opens a dropdown listing the latest items;
 * selecting one marks it read and, when it carries a link, jumps to the page
 * it refers to.
 */
export function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { notifications, unread, loading, error, refresh, refreshCount, markRead, markAllRead } =
    useNotifications(true)

  const badgeLabel = unread > 9 ? '9+' : String(unread)

  async function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      // Show fresh items the moment the panel is asked for, rather than
      // waiting out the 30-second poll.
      await refresh()
    } else {
      await refreshCount()
    }
  }

  function handleSelect(item: AppNotification) {
    if (!item.isRead) {
      void markRead(item._id)
    }
    if (item.link) {
      navigate(item.link)
    }
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={(next) => void handleOpenChange(next)}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <BellIcon />
          {unread > 0 && (
            <span
              className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white tabular-nums"
              aria-hidden="true"
            >
              {badgeLabel}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" side="bottom" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => void markAllRead()}
              className="h-6 gap-1 px-2 text-xs text-muted-foreground"
            >
              <CheckCheckIcon className="size-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto p-1">
          {loading && notifications.length === 0 && (
            <div className="space-y-1 p-2">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="flex items-start gap-2 py-1">
                  <Skeleton className="size-7 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <BellOffIcon className="size-6 text-muted-foreground/70" />
              <p className="text-sm text-muted-foreground">
                {error ? friendlyError(error, EMPTY_MESSAGE) : EMPTY_MESSAGE}
              </p>
            </div>
          )}

          {notifications.map((item) => {
            const Icon = TYPE_ICON[item.type] ?? BellIcon
            return (
              <DropdownMenuItem
                key={item._id}
                onSelect={() => handleSelect(item)}
                className={cn(
                  'items-start gap-2 rounded-md px-2 py-2.5',
                  !item.isRead && 'bg-accent/60',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full',
                    item.isRead
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary/10 text-primary',
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start gap-2">
                    <span
                      className={cn(
                        'min-w-0 flex-1 break-words',
                        item.isRead ? 'font-normal' : 'font-medium',
                      )}
                    >
                      {item.title}
                    </span>
                    {!item.isRead && (
                      <span
                        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                        aria-label="Unread"
                      />
                    )}
                  </span>
                  {item.body && (
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                      {item.body}
                    </span>
                  )}
                  <span className="mt-1 block text-[11px] text-muted-foreground/80">
                    {timeAgo(item.createdAt)}
                  </span>
                </span>
              </DropdownMenuItem>
            )
          })}
        </div>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator className="mx-0" />
            <p className="px-3 py-2 text-center text-xs text-muted-foreground">
              Showing the {notifications.length} most recent
            </p>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
