import { type ReactNode } from 'react'
import { CircleAlert, Loader2Icon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge as ShadcnBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/**
 * The one page header used by every route. `<h1>` picks up the shared heading
 * color from the base layer, so it stays correct in both themes.
 */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="grid gap-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  )
}

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <ShadcnBadge className={className}>{children}</ShadcnBadge>
}

/** Inline loading indicator. Keep headers mounted; render this in content slots. */
export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12" role="status">
      <Loader2Icon className="size-5 animate-spin text-primary" aria-hidden />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

/** Skeleton rows matching list/table layouts, for first-load placeholders. */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-11 animate-pulse rounded-md bg-muted" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-card px-6 py-10 text-center">
      <h2 className="text-base font-semibold text-card-foreground">{title}</h2>
      {message ? <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{message}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

/**
 * Inline, announced error surface. `Alert` already carries `role="alert"`, so
 * screen readers pick the message up without extra markup.
 */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertDescription className="w-full">
        <span>{message}</span>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 w-fit">
            Try again
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}
