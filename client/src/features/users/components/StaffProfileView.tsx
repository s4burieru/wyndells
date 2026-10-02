import { type ReactNode } from 'react'
import {
  Building2Icon,
  CalendarDaysIcon,
  IdCardIcon,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/common/FormControls'
import { Card } from '@/components/ui/card'
import { UserAvatar } from '@/components/common/UserAvatar'
import { formatDateTime, roleBadgeClass, roleLabel } from '@/utils/format'
import type { SafeUser } from '@/types'

/** Label/value row used inside the profile section cards. */
function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground [&>svg]:size-4" aria-hidden>
        {icon}
      </span>
      <div className="grid min-w-0 gap-0.5">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="text-sm wrap-break-word text-foreground">{value}</span>
      </div>
    </div>
  )
}

/** One section of the profile (personal / work / account information). */
function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="mt-4 grid gap-4">{children}</div>
    </Card>
  )
}

/**
 * Page-level staff profile body: header (photo, name, position, branch,
 * badges, action button) plus the information section cards. Rendered inside
 * the dashboard shell's main content area by `StaffProfilePage`.
 */
export function StaffProfileView({
  user,
  isSelf,
  canEdit,
  onEdit,
}: {
  user: SafeUser
  isSelf: boolean
  canEdit: boolean
  onEdit: () => void
}) {
  return (
    <div className="grid gap-4">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <UserAvatar name={user.name} src={user.avatarUrl} role={user.role} size="lg" className="shrink-0" />
            <div className="grid min-w-0 gap-1.5">
              <h1 className="font-display text-2xl font-bold tracking-tight wrap-break-word">{user.name}</h1>
              <p className="text-sm text-muted-foreground">{user.position || roleLabel(user.role)}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className={roleBadgeClass(user.role)}>{roleLabel(user.role)}</Badge>
                <Badge variant={user.isActive ? 'secondary' : 'outline'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2Icon className="size-3.5" aria-hidden />
                  {user.assignedBranch?.name ?? 'No branch assigned'}
                </span>
              </div>
            </div>
          </div>

          {canEdit ? (
            <Button onClick={onEdit} className="shrink-0">
              <PencilIcon />
              {isSelf ? 'Edit profile' : 'Edit details'}
            </Button>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Personal information">
          <InfoRow icon={<UserIcon />} label="Full name" value={user.name} />
          <InfoRow
            icon={<PhoneIcon />}
            label="Contact number"
            value={user.contactNumber || 'Not provided'}
          />
          <InfoRow icon={<MapPinIcon />} label="Address" value={user.address || 'Not provided'} />
        </SectionCard>

        <SectionCard title="Work information">
          <InfoRow
            icon={<IdCardIcon />}
            label="Job title"
            value={user.position || 'Not assigned'}
          />
          <InfoRow
            icon={<Building2Icon />}
            label="Assigned branch"
            value={user.assignedBranch?.name ?? 'No branch assigned'}
          />
          <InfoRow icon={<CalendarDaysIcon />} label="Added" value={formatDateTime(user.createdAt)} />
        </SectionCard>

        <SectionCard title="Account information">
          <InfoRow icon={<MailIcon />} label="Email" value={user.email} />
          <InfoRow
            icon={<ShieldCheckIcon />}
            label="Access level"
            value={roleLabel(user.role)}
          />
          <InfoRow
            icon={<UserIcon />}
            label="Account status"
            value={user.isActive ? 'Active' : 'Inactive'}
          />
        </SectionCard>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-foreground">About</h2>
        <p className="mt-3 text-sm whitespace-pre-line text-muted-foreground">
          {user.bio || 'No bio added yet.'}
        </p>
      </Card>
    </div>
  )
}
