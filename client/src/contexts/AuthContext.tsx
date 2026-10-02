import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchMe } from '@/services/api/auth'
import { getToken, setToken } from '@/services/api/client'
import type { Permission, SafeUser } from '@/types'

export type AuthState = {
  user: SafeUser | null
  loading: boolean
  signIn: (user: SafeUser, token: string) => void
  signOut: () => void
  /** Replaces the cached profile after the user edits their own details. */
  updateUser: (user: SafeUser) => void
  /**
   * Whether the signed-in account currently holds `permission`. Administrators
   * always do; everyone else follows the matrix an admin edits in
   * Settings → Roles & Permissions (fetched with the session on /api/auth/me).
   */
  can: (permission: Permission) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    let cancelled = false
    void fetchMe()
      .then((me) => {
        if (!cancelled) {
          setUser(me)
        }
      })
      .catch(() => {
        setToken(null)
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = (nextUser: SafeUser, token: string) => {
    setToken(token)
    setUser(nextUser)
  }

  const signOut = () => {
    setToken(null)
    setUser(null)
  }

  const updateUser = (nextUser: SafeUser) => {
    setUser(nextUser)
  }

  const can = useCallback(
    (permission: Permission) => {
      if (!user) {
        return false
      }
      if (user.role === 'admin') {
        return true
      }
      // Sessions written before the permission matrix existed simply have none.
      return (user.permissions ?? []).includes(permission)
    },
    [user],
  )

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, updateUser, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const state = useContext(AuthContext)
  if (!state) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return state
}
