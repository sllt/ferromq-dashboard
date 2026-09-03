import { Outlet } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppHeader } from '@/components/layout/app-header'
import { AppSidebar } from '@/components/layout/app-sidebar'

const SIDEBAR_KEY = 'ferromq_sidebar_collapsed'

export function AuthenticatedLayout() {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === '1')

  return (
    <div className="flex min-h-svh bg-background">
      <AppSidebar collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          collapsed={collapsed}
          onToggle={() => {
            const next = !collapsed
            setCollapsed(next)
            localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
          }}
        />
        <main id="main-content" tabIndex={-1} aria-label={t('a11y.main')} className="flex-1 p-5 md:p-7 outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
