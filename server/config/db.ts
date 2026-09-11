import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '../utils/ApiError'

let client: SupabaseClient | null = null

function getConfig(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new ApiError(
      503,
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.',
    )
  }
  return { url, key }
}

/**
 * Returns the shared Supabase client, creating it on first use. The client is
 * stateless — each query is a REST call to the Supabase PostgREST API through
 * the service-role key — so there is no persistent connection to manage.
 * Row-level security is enabled on every table; the service-role key is what
 * grants the API full access (all authorization stays in this Express app).
 */
export function getDb(): SupabaseClient {
  if (!client) {
    const { url, key } = getConfig()
    client = createClient(url, key, { auth: { persistSession: false } })
  }
  return client
}

/** Verifies the Supabase project is reachable. Fails softly so the API still boots for frontend work. */
export async function connectDB(): Promise<void> {
  try {
    const url = getConfig().url
    const ping = await getDb().from('branches').select('id').limit(1)
    if (ping.error) {
      console.error(`Supabase connection failed: ${ping.error.message}`)
      return
    }
    console.log(`Supabase connected: ${new URL(url).hostname}`)
  } catch (error) {
    console.error('Supabase connection failed. The API will run without a database.', error)
  }
}

/** Lightweight reachability check used by the /api/health endpoint. */
export async function getDbState(): Promise<string> {
  try {
    const ping = await getDb().from('branches').select('id').limit(1)
    return ping.error ? 'disconnected' : 'connected'
  } catch {
    return 'disconnected'
  }
}

export async function disconnectDB(): Promise<void> {
  // supabase-js holds no persistent connection; just drop the cached client.
  client = null
}