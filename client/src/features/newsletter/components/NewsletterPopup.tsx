import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Check, MailIcon, XIcon } from 'lucide-react'
import { subscribeNewsletter } from '@/services/api/newsletter'
import { friendlyError } from '@/utils/format'
import { Button, TextInput } from '@/components/common/FormControls'

/** Delay before the card appears — never on first paint. */
const POPUP_DELAY_MS = 20_000
/** sessionStorage: the card shows at most once per browsing session. */
const DISMISSED_KEY = 'wyndells:newsletter-popup-dismissed'
/** localStorage: set after any successful signup, on the home page or here. */
const SUBSCRIBED_KEY = 'wyndells:subscribed'

function hasSubscribed(): boolean {
  try {
    return localStorage.getItem(SUBSCRIBED_KEY) === '1'
  } catch {
    return false
  }
}

function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

function markDismissed(): void {
  try {
    sessionStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // Storage can be blocked; the worst case is seeing the card again later.
  }
}

/**
 * Subtle newsletter card in the bottom-right corner. Appears once per session,
 * well after the first paint, and never for a visitor who already subscribed.
 * It is deliberately not modal: no overlay, no focus trap — the page keeps
 * working underneath, and the close button (or Escape) puts it away.
 */
export function NewsletterPopup() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // Stable identity so the Escape listener is bound once while open.
  const dismiss = useCallback(() => {
    markDismissed()
    setOpen(false)
  }, [])

  useEffect(() => {
    if (wasDismissed() || hasSubscribed()) {
      return
    }
    const timer = window.setTimeout(() => setOpen(true), POPUP_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismiss()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, dismiss])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim()) {
      setError('Please add your email address.')
      return
    }
    setSubmitting(true)
    setError('')
    void subscribeNewsletter({ email: email.trim(), source: 'popup' })
      .then(() => {
        setDone(true)
        markDismissed()
        try {
          localStorage.setItem(SUBSCRIBED_KEY, '1')
        } catch {
          // Ignore: signup already succeeded.
        }
        window.setTimeout(() => setOpen(false), 3000)
      })
      .catch((reason: unknown) => setError(friendlyError(reason)))
      .finally(() => setSubmitting(false))
  }

  if (!open) {
    return null
  }

  return (
    <aside
      role="dialog"
      aria-label="Newsletter signup"
      className="fixed inset-x-4 bottom-4 z-40 animate-in fade-in-0 slide-in-from-bottom-4 duration-300 sm:inset-x-auto sm:right-6 sm:w-96"
    >
      <div className="relative overflow-hidden rounded-2xl border border-wyndell-cream-dark bg-white p-5 shadow-2xl shadow-wyndell-bark/20">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close newsletter signup"
          className="absolute top-3 right-3 rounded-full p-1 text-neutral-500 transition-colors hover:bg-wyndell-cream hover:text-wyndell-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
        >
          <XIcon className="size-4" aria-hidden />
        </button>

        {done ? (
          <div className="pr-6">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-wyndell-green/15">
              <Check className="size-5 text-wyndell-green-dark" aria-hidden />
            </span>
            <p className="mt-3 font-semibold text-wyndell-forest">You&rsquo;re on the list!</p>
            <p className="mt-1 text-sm leading-relaxed text-wyndell-ink/75">
              We&rsquo;ll keep you posted on offers, events and new menu items.
            </p>
          </div>
        ) : (
          <div className="pr-6">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-wyndell-orange/10">
              <MailIcon className="size-5 text-wyndell-orange-dark" aria-hidden />
            </span>
            <p className="mt-3 font-display text-lg font-semibold text-wyndell-forest">
              Stay in the loop
            </p>
            <p className="mt-1 text-sm leading-relaxed text-wyndell-ink/75">
              Get updates on Wyndell&rsquo;s latest offers, events, new menu items, and restaurant
              announcements.
            </p>
            <form onSubmit={handleSubmit} className="mt-4 grid gap-2">
              <label className="grid gap-1.5">
                <span className="sr-only">Email</span>
                <TextInput
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>
              {error ? (
                <p role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" disabled={submitting} className="rounded-full">
                {submitting ? 'Subscribing…' : 'Subscribe'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </aside>
  )
}
