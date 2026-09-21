import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Shared public-site section heading: a small eyebrow label above a display
 * heading, with an optional trailing link. Used across public pages so every
 * section shares one consistent rhythm.
 */
export function SectionHeading({
  eyebrow,
  title,
  action,
  align = 'between',
  className,
}: {
  eyebrow: string
  title: string
  action?: { to: string; label: string }
  align?: 'between' | 'left'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-x-6 gap-y-2',
        align === 'between' ? 'justify-between' : 'justify-start',
        className,
      )}
    >
      <div className="grid gap-1.5">
        <span className="text-xs font-semibold tracking-[0.18em] text-wyndell-orange-dark uppercase">{eyebrow}</span>
        <h2 className="font-display text-3xl font-semibold text-wyndell-forest sm:text-4xl">{title}</h2>
      </div>
      {action ? (
        <Link
          to={action.to}
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-wyndell-orange-dark underline-offset-4 hover:underline"
        >
          {action.label}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  )
}

/** Thin decorative divider used between home-page sections. */
export function SectionDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('container-wyndell', className)}>
      <div className="mx-auto h-px w-24 bg-linear-to-r from-transparent via-wyndell-orange/50 to-transparent" />
    </div>
  )
}
