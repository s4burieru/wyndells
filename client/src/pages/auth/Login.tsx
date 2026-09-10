import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../../api/auth'
import { useAuth } from '../../lib/auth'
import { friendlyError } from '../../lib/format'
import { Button, Field, TextInput } from '../../components/ui/controls'
import { Card } from '../../components/ui/display'
import { BrandLogo } from '../../components/public/Brand'

export function StaffLoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
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

  return (
    <div className="min-h-screen bg-wyndell-cream">
      <div className="container-wyndell flex min-h-screen items-center justify-center py-16">
        <Card className="w-full max-w-md p-8">
          <div className="mx-auto flex flex-col items-center gap-3">
            <BrandLogo />
            <h1 className="font-display text-xl font-bold text-wyndell-forest">Staff sign in</h1>
            <p className="text-sm text-neutral-500">Managers and administrators only.</p>
          </div>

          {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

          <div className="mt-6 grid gap-4">
            <Field label="Email">
              <TextInput
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@wyndells.com"
                autoComplete="email"
              />
            </Field>
            <Field label="Password">
              <TextInput
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void submit()
                  }
                }}
              />
            </Field>
            <Button onClick={() => void submit()} disabled={submitting} className="w-full">
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
            <div className="text-center">
              <a href="/" className="text-xs font-medium text-wyndell-orange-dark hover:underline">
                ← Back to the public site
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}