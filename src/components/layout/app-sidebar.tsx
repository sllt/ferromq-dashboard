import { Link, useRouterState } from '@tanstack/react-router'
import {
  Activity,
  Box,
  KeyRound,
  Layers,
  LayoutDashboard,
  Network,
  Plug,
  Radio,
  Route as RouteIcon,
  ScrollText,
  Send,
  UserCog,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCanAdmin, useCanWrite } from '@/lib/auth-store'
import { useClusterFeatures, type FeatureKey } from '@/lib/features'

type NavItem = {
  to: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
  feature?: FeatureKey
  write?: boolean
  admin?: boolean
}

type NavGroup = {
  titleKey: string
  items: NavItem[]
}

const groups: NavGroup[] = [
  {
    titleKey: 'nav.monitor',
    items: [
      { to: '/', labelKey: 'nav.overview', icon: LayoutDashboard },
      { to: '/nodes', labelKey: 'nav.nodes', icon: Box },
    ],
  },
  {
    titleKey: 'nav.messaging',
    items: [
      { to: '/clients', labelKey: 'nav.clients', icon: Users },
      { to: '/subscriptions', labelKey: 'nav.subscriptions', icon: Radio },
      { to: '/routes', labelKey: 'nav.routes', icon: RouteIcon },
      { to: '/retains', labelKey: 'nav.retains', icon: Layers, feature: 'retain' },
      { to: '/publish', labelKey: 'nav.publish', icon: Send, write: true },
    ],
  },
  {
    titleKey: 'nav.cluster',
    items: [{ to: '/plugins', labelKey: 'nav.plugins', icon: Plug }],
  },
  {
    titleKey: 'nav.admin',
    items: [
      { to: '/users', labelKey: 'nav.users', icon: UserCog, admin: true },
      { to: '/api-keys', labelKey: 'nav.apikeys', icon: KeyRound, admin: true },
      { to: '/audit', labelKey: 'nav.audit', icon: ScrollText, admin: true },
    ],
  },
]

export function AppSidebar({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const features = useClusterFeatures()
  const canWrite = useCanWrite()
  const canAdmin = useCanAdmin()

  return (
    <aside
      className={cn(
        'flex h-svh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200',
        collapsed ? 'w-[68px]' : 'w-60',
      )}
    >
      <div className={cn('flex h-14 items-center gap-2.5 px-3', collapsed && 'justify-center px-0')}>
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Network className="size-4" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">{t('app.name')}</div>
            <div className="truncate text-[11px] text-muted-foreground">{t('app.tagline')}</div>
          </div>
        ) : null}
      </div>
      <Separator />
      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-4 px-2">
          {groups.map((group) => {
            const visible = group.items.filter((item) => {
              if (item.admin && !canAdmin) return false
              if (item.write && !canWrite) return false
              return true
            })
            if (visible.length === 0) return null
            return (
              <div key={group.titleKey}>
                {!collapsed ? (
                  <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t(group.titleKey)}
                  </div>
                ) : null}
                <div className="space-y-0.5">
                  {visible.map((item) => {
                    const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)
                    const Icon = item.icon
                    const gated = item.feature && !features.isLoading && !features.isError && !features.has(item.feature)
                    if (gated) {
                      const label = (
                        <span
                          className={cn(
                            'flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm opacity-45',
                            collapsed && 'justify-center px-0',
                          )}
                        >
                          <Icon className="size-4 shrink-0" />
                          {!collapsed ? <span>{t(item.labelKey)}</span> : null}
                        </span>
                      )
                      return (
                        <Tooltip key={item.to}>
                          <TooltipTrigger asChild>{label}</TooltipTrigger>
                          <TooltipContent>
                            {t('features.unavailableHint', { feature: t(`nodes.${item.feature}`) })}
                          </TooltipContent>
                        </Tooltip>
                      )
                    }
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                          collapsed && 'justify-center px-0',
                          active
                            ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground',
                        )}
                      >
                        <Icon className={cn('size-4 shrink-0', active && 'text-primary')} />
                        {!collapsed ? <span>{t(item.labelKey)}</span> : null}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>
      </ScrollArea>
      <Separator />
      <div className={cn('flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground', collapsed && 'justify-center')}>
        <Activity className="size-3.5 text-emerald-500" />
        {!collapsed ? <span>/api/v1</span> : null}
      </div>
    </aside>
  )
}
