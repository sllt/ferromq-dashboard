import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronDown, KeyRound, Loader2, Network, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, getErrorMessage } from '@/lib/api'
import { initAdminFromConfig, loginWithBearer, loginWithPassword } from '@/lib/auth-boot'
import { setStoredLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function LoginPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const search = useSearch({ from: '/login' })
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState<'login' | 'init' | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [initNote, setInitNote] = useState<string | null>(null)

  async function goApp() {
    const redirect = typeof search.redirect === 'string' ? search.redirect : '/'
    await navigate({ to: redirect.startsWith('/') ? redirect : '/' })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy('login')
    setError(null)
    setInitNote(null)
    const nextToken = token.trim()
    try {
      if (nextToken) {
        await loginWithBearer(nextToken)
      } else {
        if (!username.trim() || !password) {
          setError(new Error(t('auth.empty')))
          return
        }
        await loginWithPassword(username.trim(), password)
      }
      setPassword('')
      setToken('')
      await goApp()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(null)
    }
  }

  async function onInit() {
    setBusy('init')
    setError(null)
    setInitNote(null)
    try {
      const user = await initAdminFromConfig()
      setInitNote(t('auth.initOk', { username: user.username }))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(null)
    }
  }

  const errorText =
    error == null
      ? null
      : error instanceof ApiError && error.status === 401
        ? t('auth.invalid')
        : error instanceof ApiError && error.status === 429
          ? t('errors.tooManyRequests')
          : error instanceof ApiError && error.status === 409
            ? t('auth.initExists')
            : error instanceof Error && error.message === t('auth.empty')
              ? t('auth.empty')
              : getErrorMessage(error) || t('auth.unreachable')

  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 size-[32rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-[28rem] rounded-full bg-chart-2/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:22px_22px] opacity-40" />
      </div>
      <main id="main-content" tabIndex={-1} className="relative mx-auto flex min-h-svh max-w-md flex-col justify-center px-6 outline-none">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Network className="size-5" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight">{t('app.name')}</div>
            <div className="text-sm text-muted-foreground">{t('app.tagline')}</div>
          </div>
        </div>
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border bg-card/80 p-6 shadow-xl shadow-black/5 backdrop-blur"
          autoComplete="on"
        >
          <div className="mb-5">
            <h1 className="text-xl font-semibold">{t('auth.title')}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t('auth.subtitle')}</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('auth.username')}</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoFocus
                placeholder={t('auth.usernamePlaceholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={Boolean(token.trim())}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={Boolean(token.trim())}
                  className="pr-16"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? t('auth.hide') : t('auth.show')}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="mt-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            <ChevronDown className={cn('size-3.5 transition-transform', showAdvanced && 'rotate-180')} />
            {t('auth.advanced')}
          </button>
          {showAdvanced ? (
            <div className="mt-3 space-y-2 rounded-lg border bg-muted/40 p-3">
              <Label htmlFor="token" className="flex items-center gap-1.5">
                <KeyRound className="size-3.5" />
                {t('auth.token')}
              </Label>
              <Input
                id="token"
                type="password"
                autoComplete="off"
                placeholder={t('auth.tokenPlaceholder')}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">{t('auth.tokenHint')}</p>
            </div>
          ) : null}

          {errorText ? (
            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorText}
            </div>
          ) : null}
          {initNote ? (
            <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
              {initNote}
            </div>
          ) : null}

          <Button type="submit" className="mt-5 w-full" disabled={busy != null}>
            {busy === 'login' ? <Loader2 className="animate-spin" /> : <Shield />}
            {busy === 'login' ? t('auth.connecting') : t('auth.connect')}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">{t('auth.hint')}</p>
          <button
            type="button"
            className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            disabled={busy != null}
            onClick={() => void onInit()}
          >
            {busy === 'init' ? t('auth.initBusy') : t('auth.init')}
          </button>
        </form>
        <div className="mt-6 flex justify-end gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            className="hover:text-foreground"
            onClick={() => {
              void i18n.changeLanguage('zh-CN')
              setStoredLocale('zh-CN')
            }}
          >
            中文
          </button>
          <span>/</span>
          <button
            type="button"
            className="hover:text-foreground"
            onClick={() => {
              void i18n.changeLanguage('en')
              setStoredLocale('en')
            }}
          >
            EN
          </button>
        </div>
      </main>
    </div>
  )
}
