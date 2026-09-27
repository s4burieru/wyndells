import { getSupabaseClient } from '@/services/supabase'

/** Where Google (via Supabase Auth) sends the browser back to. */
function redirectTarget(): string {
  return `${window.location.origin}/staff/login`
}

/** Drops the OAuth query string / hash fragment left behind by the redirect. */
function clearRedirectParams(): void {
  if (window.location.search || window.location.hash) {
    window.history.replaceState({}, '', window.location.pathname)
  }
}

const NOT_CONFIGURED = 'Google sign-in is not available on this deployment. Please use your email and password.'

/**
 * Starts the Google OAuth flow: the browser leaves for Google's consent screen
 * and comes back to `/staff/login`, where `completeGoogleSignIn` finishes the
 * handshake. Nothing about the account is decided here.
 */
export async function beginGoogleSignIn(): Promise<void> {
  const supabase = await getSupabaseClient()
  if (!supabase) {
    throw new Error(NOT_CONFIGURED)
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTarget(),
      // Always let the person pick which Google account they are using.
      queryParams: { prompt: 'select_account' },
    },
  })

  if (error) {
    throw error
  }
}

/**
 * Finishes the round trip and returns the Supabase access token that proves the
 * Google identity (or null for a normal visit, so the page renders untouched).
 *
 * The token by itself grants nothing: the API verifies it with Supabase and
 * then checks that the email belongs to an active, authorized staff account.
 * Callers must release it with `endGoogleSession` once the API is done.
 */
export async function completeGoogleSignIn(): Promise<string | null> {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const failure = params.get('error')
  if (!code && !failure) {
    return null
  }

  clearRedirectParams()

  if (failure) {
    const description = params.get('error_description')
    throw new Error(
      description
        ? decodeURIComponent(description.replace(/\+/g, ' '))
        : 'Google sign-in was cancelled before it finished.',
    )
  }

  const supabase = await getSupabaseClient()
  if (!code || !supabase) {
    throw new Error(NOT_CONFIGURED)
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.session) {
    throw new Error('We could not verify your Google sign-in. Please try again.')
  }

  // The token is returned untouched: the API still has to verify it with
  // Supabase, and signing out here would revoke the very session being checked.
  return data.session.access_token
}

/**
 * Drops the temporary Supabase session once the API has finished verifying it.
 * Must not be called before that: `signOut` revokes the session server-side, so
 * verifying the token afterwards would fail with "could not verify".
 *
 * The portal's own session is a separate JWT, so it is unaffected.
 */
export async function endGoogleSession(): Promise<void> {
  const supabase = await getSupabaseClient()
  if (!supabase) {
    return
  }
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // Best effort — a leftover session expires on its own and grants nothing.
  }
}
