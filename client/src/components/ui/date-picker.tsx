import { CalendarDays } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/utils/cn'
import { dateStringToDate, dateToString, formatDate } from '@/utils/format'

/**
 * Button trigger styled to match `ui/input.tsx`, so it drops into the same
 * form layouts as the native `<input type="date">` it replaces.
 */
const TRIGGER_CLASSES = cn(
  'flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-wyndell-amber md:text-sm dark:bg-input/30',
  'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
)

export function DatePicker({
  value,
  onChange,
  min,
  placeholder = 'Pick a date',
  disabled,
  id,
  className,
  'aria-label': ariaLabel,
}: {
  /** Currently selected date as `YYYY-MM-DD`, or `''` for none. */
  value: string
  onChange: (value: string) => void
  /** Earliest selectable date as `YYYY-MM-DD` — earlier days render disabled. */
  min?: string
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
  'aria-label'?: string
}) {
  const selected = dateStringToDate(value)
  const minDate = min ? dateStringToDate(min) : undefined

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(TRIGGER_CLASSES, className)}
        >
          <span className={cn('truncate text-left', !value && 'text-muted-foreground')}>
            {value ? formatDate(value) : placeholder}
          </span>
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(day) => {
            if (day) {
              onChange(dateToString(day))
            }
          }}
          disabled={minDate ? { before: minDate } : undefined}
        />
      </PopoverContent>
    </Popover>
  )
}
