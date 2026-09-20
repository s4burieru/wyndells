import { type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { Button as ShadcnButton } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'green'

/** Maps the app's button variants onto shadcn/ui button variants. */
const VARIANT_MAP: Record<
  ButtonVariant,
  { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className?: string }
> = {
  primary: { variant: 'default' },
  secondary: { variant: 'secondary' },
  green: { variant: 'default', className: 'bg-wyndell-green text-white hover:bg-wyndell-green-dark' },
  ghost: { variant: 'outline' },
  danger: {
    variant: 'outline',
    className: 'border-destructive/30 text-destructive hover:bg-destructive/10',
  },
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: ComponentPropsWithoutRef<'button'> & { variant?: ButtonVariant }) {
  const mapped = VARIANT_MAP[variant]
  return (
    <ShadcnButton variant={mapped.variant} className={cn(mapped.className, className)} {...props} />
  )
}

export function ButtonLink({
  to,
  variant = 'primary',
  className,
  children,
}: {
  to: string
  variant?: ButtonVariant
  className?: string
  children: ReactNode
}) {
  const mapped = VARIANT_MAP[variant]
  return (
    <ShadcnButton asChild variant={mapped.variant} className={cn(mapped.className, className)}>
      <Link to={to}>{children}</Link>
    </ShadcnButton>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <Label className="grid items-start gap-2 leading-normal select-text">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
    </Label>
  )
}

export function TextInput(props: ComponentPropsWithoutRef<'input'>) {
  return <Input {...props} />
}

export function TextArea(props: ComponentPropsWithoutRef<'textarea'>) {
  return <Textarea className="min-h-24" {...props} />
}

const SELECT_CLASSES = cn(
  'h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-base shadow-xs',
  'bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat',
  'text-foreground transition-[color,box-shadow] outline-none',
  'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 md:text-sm',
  "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236f6a5c%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]"
)

/**
 * Native select styled to match the shadcn/ui input & select components.
 * (Keeps the plain `<option>` API used across the app's forms.)
 */
export function SelectInput(props: ComponentPropsWithoutRef<'select'>) {
  return <select data-slot="select-input" className={SELECT_CLASSES} {...props} />
}
