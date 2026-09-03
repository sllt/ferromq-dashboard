import { Link, useRouterState } from '@tanstack/react-router'
import {
  Activity,
  Box,
  Layers,
  LayoutDashboard,
  Network,
  Plug,
  Radio,
  Route as RouteIcon,
  Send,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

type NavItem = {
  to: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
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
      { to: '/retains', labelKey: 'nav.retains', icon: Layers },
      { to: '/publish', labelKey: 'nav.publish', icon: Send },
    ],
  },
  {
    titleKey: 'nav.cluster',
    items: [{ to: '/plugins', labelKey: 'nav.plugins', icon: Plug }],
  },
]

export function AppSidebar({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

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
          {groups.map((group) => (
            <div key={group.titleKey}>
              {!collapsed ? (
                <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t(group.titleKey)}
                </div>
              ) : null}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)
                  const Icon = item.icon
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
          ))}
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
