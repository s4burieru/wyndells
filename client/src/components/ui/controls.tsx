import { type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

type ButtonProps = ComponentPropsWithoutRef<'button'>
type InputProps = ComponentPropsWithoutRef<'input'>
type SelectProps = ComponentPropsWithoutRef<'select'>
type TextareaProps = ComponentPropsWithoutRef<'textarea'>

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'green'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-wyndell-orange text-white hover:bg-wyndell-orange-dark focus-visible:outline-wyndell-orange',
  secondary: 'bg-wyndell-green-dark text-white hover:bg-wyndell-green focus-visible:outline-wyndell-green-dark',
  green: 'bg-wyndell-green text-white hover:bg-wyndell-green-dark focus-visible:outline-wyndell-green',
  ghost: 'bg-transparent text-wyndell-ink border border-wyndell-ink/20 hover:bg-wyndell-cream-dark',
  danger: 'bg-white text-red-700 border border-red-300 hover:bg-red-50',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps & { variant?: ButtonVariant }) {
  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
    VARIANT_CLASSES[variant],
    className,
  ].join(' ')
  return <button className={classes} {...props} />
}

export function ButtonLink({
  to,
  variant = 'primary',
  className = '',
  children,
}: {
  to: string
  variant?: ButtonVariant
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      className={['inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold', VARIANT_CLASSES[variant], className].join(' ')}
    >
      {children}
    </Link>
  )
}

const FIELD_CLASSES =
  'w-full rounded-lg border border-wyndell-ink/20 bg-white px-3 py-2 text-sm text-wyndell-ink placeholder:text-neutral-400 focus:border-wyndell-orange focus:outline-2 focus:outline-wyndell-orange/40 disabled:bg-neutral-100'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-wyndell-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-neutral-500">{hint}</span> : null}
    </label>
  )
}

export function TextInput(props: InputProps) {
  return <input className={FIELD_CLASSES} {...props} />
}

export function TextArea(props: TextareaProps) {
  return <textarea className={[FIELD_CLASSES, 'min-h-24'].join(' ')} {...props} />
}

export function SelectInput(props: SelectProps) {
  return <select className={FIELD_CLASSES} {...props} />
}