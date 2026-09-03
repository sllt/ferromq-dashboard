import { Languages, LogOut, Moon, PanelLeft, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/lib/auth-store'
import { applyTheme, getStoredTheme, type Theme } from '@/lib/theme'
import { setStoredLocale } from '@/lib/i18n'
import { useEffect, useState } from 'react'

export function AppHeader({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const { t, i18n } = useTranslation()
  const logout = useAuthStore((s) => s.logout)
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md">
      <Button size="icon" variant="ghost" onClick={onToggle} aria-label="Toggle sidebar">
        <PanelLeft className={collapsed ? 'rotate-180' : ''} />
      </Button>
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
            <Button size="sm" variant="outline">
              {t('app.name')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              {t('auth.hint')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout()
                window.location.hash = '#/login'
              }}
            >
              <LogOut className="size-4" />
              {t('auth.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
