import { KeyRound, Languages, LogOut, Moon, PanelLeft, Sun, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ChangePasswordDialog } from '@/features/auth/change-password-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logoutSession } from '@/lib/auth-boot'
import { useAuthStore } from '@/lib/auth-store'
import { applyTheme, getStoredTheme, type Theme } from '@/lib/theme'
import { setStoredLocale } from '@/lib/i18n'

export function AppHeader({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme())
  const [pwdOpen, setPwdOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  async function onLogout() {
    setSigningOut(true)
    try {
      await logoutSession()
      await navigate({ to: '/login' })
    } finally {
      setSigningOut(false)
    }
  }

  const roleLabel = user?.role === 'viewer' ? t('auth.roleViewer') : t('auth.roleAdmin')
  const authLabel =
    user?.auth === 'bearer'
      ? t('auth.kindBearer')
      : user?.auth === 'anonymous'
        ? t('auth.kindAnonymous')
        : t('auth.kindSession')

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" onClick={onToggle} aria-label="Toggle sidebar">
          <PanelLeft className={collapsed ? 'rotate-180' : ''} />
        </Button>
        {user?.role === 'viewer' ? (
          <Badge variant="warning">{t('auth.readonlyBadge')}</Badge>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={t('theme.toggle')}
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="Language">
              <Languages />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                void i18n.changeLanguage('zh-CN')
                setStoredLocale('zh-CN')
              }}
            >
              {t('lang.zh')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void i18n.changeLanguage('en')
                setStoredLocale('en')
              }}
            >
              {t('lang.en')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="max-w-48 gap-2">
              <UserRound className="size-3.5" />
              <span className="truncate">{user?.username ?? t('app.name')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <div className="px-2 py-1.5">
              <div className="truncate text-sm font-medium">{user?.username ?? t('app.name')}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant={user?.role === 'viewer' ? 'warning' : 'success'}>{roleLabel}</Badge>
                <Badge variant="secondary">{authLabel}</Badge>
              </div>
            </div>
            <DropdownMenuSeparator />
            {user?.auth === 'session' ? (
              <DropdownMenuItem onClick={() => setPwdOpen(true)}>
                <KeyRound className="size-4" />
                {t('auth.changePassword')}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {t('auth.changePasswordUnavailable')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={signingOut} onClick={() => void onLogout()}>
              <LogOut className="size-4" />
              {t('auth.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
    </header>
  )
}
