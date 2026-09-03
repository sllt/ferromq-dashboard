import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Loader2, Network, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { endpoints } from '@/lib/endpoints'

export function LoginPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const search = useSearch({ from: '/login' })
  const connect = useAuthStore((s) => s.connect)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const next = token.trim()
    connect(next)
    try {
      await endpoints.listApis()
      const redirect = typeof search.redirect === 'string' ? search.redirect : '/'
      await navigate({ to: redirect.startsWith('/') ? redirect : '/' })
    } catch (err) {
      useAuthStore.getState().logout()
      if (err instanceof ApiError && err.status === 401) {
        setError(t('auth.invalid'))
      } else {
        setError(getErrorMessage(err) || t('auth.unreachable'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 size-[32rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-[28rem] rounded-full bg-chart-2/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:22px_22px] opacity-40" />
      </div>
      <div className="relative mx-auto flex min-h-svh max-w-md flex-col justify-center px-6">
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
        >
          <div className="mb-5">
            <h1 className="text-xl font-semibold">{t('auth.title')}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t('auth.subtitle')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="token">{t('auth.token')}</Label>
            <Input
              id="token"
              type="password"
              autoComplete="off"
              placeholder={t('auth.tokenPlaceholder')}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="font-mono"
            />
          </div>
          {error ? (
            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <Button type="submit" className="mt-5 w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Shield />}
            {busy ? t('auth.connecting') : t('auth.connect')}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">{t('auth.hint')}</p>
        </form>
        <div className="mt-6 flex justify-end gap-2 text-xs text-muted-foreground">
          <button type="button" className="hover:text-foreground" onClick={() => void i18n.changeLanguage('zh-CN')}>
            中文
          </button>
          <span>/</span>
          <button type="button" className="hover:text-foreground" onClick={() => void i18n.changeLanguage('en')}>
            EN
          </button>
        </div>
      </div>
    </div>
  )
}
