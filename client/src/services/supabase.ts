import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Browser-side Supabase client, used for one thing only: running the Google
 * OAuth handshake so the API can verify who the visitor is.
 *
 * Only the project URL and the anon ("publishable") key are used here. Both are
 * meant to be public — every table is protected by row-level security and the
 * API talks to Supabase with a service-role key that never leaves the server.
 * No authorization decision is made in the browser.
 *
 * The library itself is imported on demand, so the thousands of visitors who
 * never touch Google never download it.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

let clientPromise: Promise<SupabaseClient | null> | null = null

/** True when this build has the Supabase project configured for Google OAuth. */
export function isGoogleSignInConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}

/**
 * Loads the shared browser client (null when the project is not configured, so
 * the login page can explain that instead of crashing).
 *
 * `detectSessionInUrl` is off because the OAuth redirect lands on the staff
 * login page and is consumed explicitly by `completeGoogleSignIn`, which needs
 * the PKCE `code` before it disappears from the URL.
 */
export function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!isGoogleSignInConfigured()) {
    return Promise.resolve(null)
  }
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
      }),
    )
  }
  return clientPromise
}

