import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeftIcon, ChevronRightIcon } from 'lucide-react'
import { toast } from 'sonner'
import { updateProfile } from '@/services/api/auth'
import { ApiError } from '@/services/api/client'
import { fetchStaffProfile, updateUser } from '@/services/api/users'
import { useAuth } from '@/contexts/AuthContext'
import type { SafeUser } from '@/types'
import { friendlyError } from '@/utils/format'
import { ErrorState } from '@/components/common/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { StaffProfileView, UserFormModal } from '@/features/users/components'

/** Placeholder mirroring the loaded layout so the page doesn't jump. */
function ProfileSkeleton() {
  return (
    <div className="grid gap-4" role="status" aria-busy>
      <span className="sr-only">Loading profile…</span>
      <div className="flex items-start gap-4 rounded-xl border bg-card p-5 sm:p-6">
        <Skeleton className="size-20 shrink-0 rounded-full" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-44 rounded-full" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((card) => (
          <div key={card} className="grid gap-4 rounded-xl border bg-card p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 rounded-xl border bg-card p-5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

/**
 * Full-page staff profile inside the dashboard shell (sidebar + topbar stay
 * mounted). The `:id` param drives the data load, so every profile is a
 * deep link; `location.state.from` carries the page to return to.
 */
export function StaffProfilePage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { user: currentUser, updateUser: setAuthUser, can } = useAuth()

  const [profile, setProfile] = useState<SafeUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  const state = location.state as { from?: string } | null
  const from = state?.from && state.from.startsWith('/staff') ? state.from : '/staff/directory'
  const fromLabel = from.startsWith('/staff/users')
    ? 'Users & Managers'
    : from.startsWith('/staff/directory')
      ? 'Staff Directory'
      : 'Dashboard'

  const load = () => {
    setLoading(true)
    setError('')
    if (!id) {
      setProfile(null)
      setError('This staff profile could not be found. It may have been removed.')
      setLoading(false)
      return
    }
    void fetchStaffProfile(id)
      .then((loaded) => {
        setProfile(loaded)
        setError('')
      })
      .catch((reason: unknown) => {
        setProfile(null)
        setError(
          reason instanceof ApiError && reason.statusCode === 404
            ? 'This staff profile could not be found. It may have been removed.'
            : friendlyError(reason, 'Unable to load this profile.'),
        )
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const isSelf = currentUser !== null && profile !== null && currentUser.id === profile.id
  const canEdit = isSelf || can('users.manage')

  const handleSave = (payload: Record<string, unknown> | FormData) => {
    if (!profile) {
      return
    }
    const request = isSelf ? updateProfile(payload) : updateUser(profile.id, payload)
    void request
      .then((updated) => {
        setProfile(updated)
        if (isSelf) {
          setAuthUser(updated)
        }
        setEditing(false)
        toast.success(
          isSelf ? 'Your profile has been updated.' : `${updated.name}'s details have been updated.`,
        )
      })
      .catch((reason: unknown) => toast.error(friendlyError(reason)))
  }

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm">
        <Link
          to={from}
          className="-ml-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          {fromLabel}
        </Link>
        <ChevronRightIcon className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="font-medium text-foreground" aria-current="page">
          {loading ? 'Profile' : profile?.name ?? 'Profile'}
        </span>
      </nav>

      {loading ? <ProfileSkeleton /> : null}

      {!loading && error ? (
        <ErrorState message={error} onRetry={load} />
      ) : null}

      {!loading && !error && profile ? (
        <>
          <StaffProfileView
            user={profile}
            isSelf={isSelf}
            canEdit={canEdit === true}
            onEdit={() => setEditing(true)}
          />
          {editing ? (
            <UserFormModal
              user={profile}
              self={isSelf}
              onClose={() => setEditing(false)}
              onSave={handleSave}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
