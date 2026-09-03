import { Outlet, createRootRoute } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ErrorFallback } from '@/components/app-error-boundary'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ensureSession } from '@/lib/auth-boot'

function BootSplash() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
    </div>
  )
}

export const Route = createRootRoute({
  beforeLoad: async () => {
    await ensureSession()
  },
  pendingComponent: BootSplash,
  errorComponent: ({ error, reset }) => <ErrorFallback error={error} onReset={reset} />,
  component: RootComponent,
})

function RootComponent() {
  const { t } = useTranslation()
  return (
    <TooltipProvider delayDuration={200}>
      <a
        href="#main-content"
        className="fixed left-4 top-0 z-50 -translate-y-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-md focus:translate-y-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={(e) => {
          e.preventDefault()
          const main = document.getElementById('main-content')
          main?.focus()
          main?.scrollIntoView()
        }}
      >
        {t('a11y.skipToMain')}
      </a>
      <Outlet />
      <Toaster />
    </TooltipProvider>
  )
}
