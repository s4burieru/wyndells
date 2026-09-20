import { type ReactNode } from 'react'
import { Building2Icon, CalendarDaysIcon, MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/controls'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet'
import { UserAvatar } from '../../components/dashboard/UserAvatar'
import { formatDateTime, roleBadgeClass, roleLabel } from '../../lib/format'
import type { SafeUser } from '../../lib/types'

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground [&>svg]:size-4" aria-hidden>
        {icon}
      </span>
      <div className="grid gap-0.5">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="text-sm break-words text-foreground">{value}</span>
      </div>
    </div>
  )
}

/**
 * Read-only staff profile drawer built on the shadcn/ui sheet primitive.
 * Opened from the Users & Managers table and from the sidebar account block.
 */
export function UserProfileSheet({
  user,
  open,
  onClose,
  onEdit,
}: {
  user: SafeUser | null
  open: boolean
  onClose: () => void
  onEdit?: (user: SafeUser) => void
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose()
        }
      }}
    >
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        {user ? (
          <>
            <SheetHeader className="gap-4 border-b">
              <div className="flex items-center gap-4">
                <UserAvatar name={user.name} src={user.avatarUrl} role={user.role} size="lg" />
                <div className="grid gap-1">
                  <SheetTitle className="text-lg">{user.name}</SheetTitle>
                  <SheetDescription>{user.position || roleLabel(user.role)}</SheetDescription>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={roleBadgeClass(user.role)}>{roleLabel(user.role)}</Badge>
                    <Badge variant={user.isActive ? 'secondary' : 'outline'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="grid gap-4 overflow-y-auto p-4">
              <DetailRow icon={<MailIcon />} label="Email" value={user.email} />
              <DetailRow icon={<PhoneIcon />} label="Contact number" value={user.contactNumber || 'Not provided'} />
              <DetailRow
                icon={<Building2Icon />}
                label="Assigned branch"
                value={user.assignedBranch?.name ?? 'No branch assigned'}
              />
              <DetailRow icon={<MapPinIcon />} label="Address" value={user.address || 'Not provided'} />
              <DetailRow icon={<CalendarDaysIcon />} label="Added" value={formatDateTime(user.createdAt)} />

              <div className="grid gap-1.5 border-t pt-4">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Bio</span>
                <p className="text-sm whitespace-pre-line text-foreground">
                  {user.bio || 'No bio added yet.'}
                </p>
              </div>
            </div>

            {onEdit ? (
              <SheetFooter className="border-t">
                <Button variant="ghost" onClick={() => onEdit(user)}>
                  Edit my profile
                </Button>
              </SheetFooter>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}