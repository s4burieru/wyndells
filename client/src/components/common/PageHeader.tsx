import { type ReactNode } from 'react'
import { CircleAlert, Loader2Icon } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge as ShadcnBadge } from '@/components/ui/badge'
import {
  Card as ShadcnCard,
  CardAction,
  CardDescription,
  CardHeader as ShadcnCardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/** App card surface built on the shadcn/ui card primitives. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <ShadcnCard className={cn('gap-0 py-0', className)}>
      {children}
    </ShadcnCard>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <ShadcnCardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
      {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
      {action ? <CardAction>{action}</CardAction> : null}
    </ShadcnCardHeader>
  )
}

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <ShadcnBadge className={className}>{children}</ShadcnBadge>
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12" role="status">
      <Loader2Icon className="size-6 animate-spin text-primary" aria-hidden />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="mx-auto rounded-xl border border-dashed bg-card px-6 py-10 text-center">
      <p className="text-base font-semibold text-foreground">{title}</p>
      {message ? <p className="mt-1 text-sm text-muted-foreground">{message}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertDescription>
        <span>{message}</span>
        {onRetry ? (
          <Button
            variant="outline"
            onClick={onRetry}
            className="w-fit border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Try again
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="grid gap-1">
        <h1 className="font-display text-2xl font-bold text-wyndell-forest">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}
