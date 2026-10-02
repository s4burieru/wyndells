import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CircleAlert, Loader2Icon } from 'lucide-react'
import heroHome from '@/assets/images/hero-home.png'
import { login, loginWithGoogle } from '@/services/api/auth'
import { isGoogleSignInConfigured } from '@/services/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { friendlyError } from '@/utils/format'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { BrandLogo } from '@/components/common/Brand'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'
import { beginGoogleSignIn, completeGoogleSignIn, endGoogleSession } from '@/features/auth/googleSignIn'

/**
 * Staff sign in (two-column layout). Two ways in, both ending in the same portal
 * session:
 *
 * - email + password, checked against the staff table; or
 * - "Continue with Google", which proves the Google identity through Supabase
 *   Auth and then asks the API whether that email is an authorized, active
 *   staff account.
 *
 * There is deliberately no sign-up path: Google can never create an account and
 * unknown emails are refused.
 */
export function StaffLoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googlePending, setGooglePending] = useState(false)
  const googleAvailable = isGoogleSignInConfigured()
  // A redirect back from Google always carries a `code`; starting in the
  // verifying state avoids flashing the empty form first.
  const [verifyingGoogle, setVerifyingGoogle] = useState(
    () => googleAvailable && new URLSearchParams(window.location.search).has('code'),
  )
  const [error, setError] = useState('')
  /** The OAuth redirect is exchanged once per page load. */
  const handledRedirect = useRef(false)

  const busy = submitting || googlePending || verifyingGoogle

  useEffect(() => {
    if (!googleAvailable || handledRedirect.current) {
      return
    }
    void (async () => {
      let accessToken: string | null
      try {
        accessToken = await completeGoogleSignIn()
      } catch (reason: unknown) {
        setError(friendlyError(reason, 'We could not complete the Google sign-in. Please try again.'))
        setVerifyingGoogle(false)
        return
      }
      if (!accessToken) {
        return
      }

      handledRedirect.current = true
      setVerifyingGoogle(true)
      try {
        // The API verifies the token and decides whether this Google account is
        // an authorized, active staff member — the browser never decides that.
        const { token, user } = await loginWithGoogle(accessToken)
        signIn(user, token)
        navigate('/staff')
      } catch (reason: unknown) {
        setError(friendlyError(reason, 'We could not sign you in with Google. Please try again.'))
      } finally {
        // Only now is it safe to drop the temporary Supabase session: it is the
        // proof the API just checked, and clearing it revokes that token.
        await endGoogleSession()
        setVerifyingGoogle(false)
      }
    })()
  }, [googleAvailable, navigate, signIn])

  const submitPassword = async () => {
    if (!email.trim() || !password) {
      setError('Please enter both your email and password.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const { token, user } = await login(email.trim(), password)
      signIn(user, token)
      navigate('/staff')
    } catch (reason: unknown) {
      setError(friendlyError(reason, 'Unable to sign in. Check your credentials.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submitPassword()
  }

  const signInWithGoogle = async () => {
    setError('')
    setGooglePending(true)
    try {
      // Leaves this page for Google's consent screen; the browser comes back to
      // /staff/login, where the effect above finishes the sign-in.
      await beginGoogleSignIn()
    } catch (reason: unknown) {
      setError(friendlyError(reason, 'We could not start Google sign-in. Please try again.'))
      setGooglePending(false)
    }
  }

  return (
    <div className="grid min-h-svh bg-wyndell-cream lg:grid-cols-2">
      <div className="flex flex-col gap-6 p-6 md:p-10">
        <div className="flex justify-center md:justify-start">
          <BrandLogo className="h-14 w-auto" />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <form className="flex flex-col gap-6" onSubmit={handlePasswordSubmit}>
              <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                  <h1 className="font-display text-2xl font-bold text-wyndell-forest">Staff sign in</h1>
                  <p className="text-sm text-balance text-muted-foreground">
                    Managers, HR and administrators only.
                  </p>
                </div>

                {error ? (
                  <Alert variant="destructive">
                    <CircleAlert />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@wyndells.com"
                    autoComplete="email"
                    disabled={busy}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={busy}
                  />
                </Field>

                <Field>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {submitting ? 'Signing in…' : 'Sign in'}
                  </Button>
                </Field>

                <FieldSeparator>Or continue with</FieldSeparator>

                <Field>
                  <GoogleSignInButton
                    onClick={() => void signInWithGoogle()}
                    disabled={busy || !googleAvailable}
                    pending={googlePending}
                  />
                  {verifyingGoogle ? (
                    <p
                      className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
                      role="status"
                    >
                      <Loader2Icon className="size-4 animate-spin" aria-hidden />
                      Verifying your Google account…
                    </p>
                  ) : null}
                  <FieldDescription className="text-center">
                    {googleAvailable
                      ? 'Google sign-in only works for accounts an administrator has already authorized.'
                      : 'Google sign-in is not configured on this deployment — use your email and password.'}
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>

            <p className="mt-6 text-center">
              <Link to="/" className="text-xs font-medium text-wyndell-orange-dark hover:underline">
                ← Back to the public site
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Cover image — the Wyndell's dining room, hidden on smaller screens. */}
      <div className="relative hidden bg-muted lg:block">
        <img
          src={heroHome}
          alt="A Wyndell's dining room"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-wyndell-bark/90 via-wyndell-bark/25 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 p-10">
          <p className="font-display text-2xl font-bold text-white">Serve every guest like family.</p>
          <p className="mt-2 max-w-sm text-sm text-white/80">
            Reservations, tables, menus and staff across every Wyndell&rsquo;s branch — in one place.
          </p>
        </div>
      </div>
    </div>
  )
}
