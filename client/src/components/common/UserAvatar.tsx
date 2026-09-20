import { cn } from '@/lib/utils'
import { roleAvatarClass } from '../../lib/format'
import type { Role } from '../../lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'

const SIZE_CLASSES = {
  xs: 'size-8 text-[0.65rem]',
  sm: 'size-10 text-xs',
  md: 'size-12 text-sm',
  lg: 'size-20 text-lg',
} as const

/** Two-letter initials, e.g. "Wyndell's Administrator" → "WA". */
export function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((part) => part !== '')
  if (parts.length === 0) {
    return '?'
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Staff avatar built on the shadcn/ui avatar primitive: shows the uploaded
 * photo when present, otherwise the member's initials tinted by role.
 */
export function UserAvatar({
  name,
  src,
  role = 'manager',
  size = 'sm',
  className,
}: {
  name: string
  src?: string
  role?: Role
  size?: keyof typeof SIZE_CLASSES
  className?: string
}) {
  return (
    <Avatar className={cn(SIZE_CLASSES[size], className)}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback className={cn('font-semibold', roleAvatarClass(role))}>
        {userInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}