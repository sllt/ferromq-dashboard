import { Outlet } from '@tanstack/react-router'
import { useState } from 'react'
import { AppHeader } from '@/components/layout/app-header'
import { AppSidebar } from '@/components/layout/app-sidebar'

const SIDEBAR_KEY = 'ferromq_sidebar_collapsed'

export function AuthenticatedLayout() {
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
        <main className="flex-1 p-5 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
