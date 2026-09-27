/// <reference types="vite/client" />

/**
 * Client env vars (read from the repo-root .env — see `envDir` in
 * vite.config.ts). Only `VITE_`-prefixed values reach the browser.
 */
interface ImportMetaEnv {
  /** Supabase project URL used by the browser client for the Google OAuth handshake. */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon ("publishable") key. Safe in the browser: every table is RLS-protected. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}
