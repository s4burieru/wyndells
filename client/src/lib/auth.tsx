import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchMe } from '../api/auth'
import { getToken, setToken } from './api'
import type {  SafeUser  } from './types'

export type AuthState = {
  user: SafeUser | null
  loading: boolean
  signIn: (user: SafeUser, token: string) => void
  signOut: () => void
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

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
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