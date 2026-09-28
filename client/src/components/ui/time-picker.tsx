import { Clock3 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/utils/cn'

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1))
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))
const PERIODS = ['AM', 'PM'] as const

type Period = (typeof PERIODS)[number]

type TimeParts = { hour12: string; minute: string; period: Period }

/** Splits a `HH:MM` (24-hour) value into 12-hour clock parts. */
function parseTime(value: string): TimeParts | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!match) {
    return null
  }
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) {
    return null
  }
  return {
    hour12: String(hours % 12 === 0 ? 12 : hours % 12),
    minute: String(minutes).padStart(2, '0'),
    period: hours >= 12 ? 'PM' : 'AM',
  }
}

/** Joins clock parts back into the `HH:MM` (24-hour) value the API expects. */
function toTimeValue({ hour12, minute, period }: TimeParts): string {
  const hour = Number(hour12) % 12
  const hours24 = period === 'PM' ? hour + 12 : hour
  return `${String(hours24).padStart(2, '0')}:${minute}`
}

/**
 * Time picker built from the shadcn/ui Select components. Emits `HH:MM`
 * (24-hour) strings, matching `formatTime12()` and the reservation slots.
 * When `value` is empty the picker starts at 12:00 AM and emits a complete
 * time as soon as any part changes.
 */
export function TimePicker({
  value,
  onChange,
  disabled,
  className,
}: {
  /** Selected time as `HH:MM`, or `''` for none. */
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}) {
  const parts: TimeParts = parseTime(value) ?? { hour12: '12', minute: '0', period: 'AM' }

  const update = (patch: Partial<TimeParts>) => {
    onChange(toTimeValue({ ...parts, ...patch }))
  }

  const fieldClassName = cn('w-full flex-1', disabled && 'pointer-events-none opacity-50')

  return (
    <div className={cn('flex items-center gap-1.5', className)} role="group" aria-label="Time">
      <Clock3 className="size-4 shrink-0 text-wyndell-orange-dark" aria-hidden />
      <Select
        value={parts.hour12}
        disabled={disabled}
        onValueChange={(hour12) => update({ hour12 })}
      >
        <SelectTrigger className={fieldClassName} aria-label="Hour">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((hour) => (
            <SelectItem key={hour} value={hour}>
              {hour}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={parts.minute}
        disabled={disabled}
        onValueChange={(minute) => update({ minute })}
      >
        <SelectTrigger className={fieldClassName} aria-label="Minute">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((minute) => (
            <SelectItem key={minute} value={minute}>
              {minute}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={parts.period}
        disabled={disabled}
        onValueChange={(period) => update({ period: period as Period })}
      >
        <SelectTrigger className={cn(fieldClassName, 'w-20')} aria-label="AM or PM">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((period) => (
            <SelectItem key={period} value={period}>
              {period}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
