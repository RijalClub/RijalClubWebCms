import { useState } from 'react'
import { LogIn, Eye, EyeOff, Shield } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { ThemeToggle } from './ThemeToggle'

export function LoginPage({ onSubmit, loading }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (!username.trim() || !password.trim()) {
      setError('Enter both username and password.')
      return
    }

    setError('')

    try {
      await onSubmit({ username: username.trim(), password })
    } catch (apiError) {
      setError(apiError.message || 'Login failed.')
    }
  }

  return (
    <div className="min-h-svh flex">
      {/* Left decorative panel - hidden on mobile */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-[hsl(160,28%,12%)] via-[hsl(163,45%,18%)] to-[hsl(155,30%,10%)] p-10 text-white">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(243,168,59,0.2) 0%, transparent 50%)',
        }} />

        <div className="relative z-10 flex items-center gap-3">
          <img src="/rijal.svg" alt="Rijal Club" className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight">Rijal Club</span>
        </div>

        <div className="relative z-10 space-y-4">
          <blockquote className="space-y-2">
            <p className="text-xl font-medium leading-relaxed text-white/90">
              &ldquo;Managing our content has never been easier. The CMS gives us full control over every aspect of
              our digital presence.&rdquo;
            </p>
            <footer className="text-sm text-white/60">
              &mdash; Rijal Club Admin Team
            </footer>
          </blockquote>
        </div>

        <div className="relative z-10 text-sm text-white/40">
          Rijal Club CMS &middot; Content Management System
        </div>
      </div>

      {/* Right login form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-6 sm:p-8">
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <ThemeToggle />
        </div>

        <div className="mx-auto w-full max-w-sm space-y-8">
          {/* Logo & heading */}
          <div className="flex flex-col items-center space-y-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 lg:hidden">
              <img src="/rijal.svg" alt="Rijal Club" className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
              <p className="text-sm text-muted-foreground">
                Sign in to the Rijal Club CMS admin panel
              </p>
            </div>
          </div>

          {/* Login form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="Enter your username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <Shield className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign in
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Master and editor access only. No public registration.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
