import { Outlet, createRootRoute } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
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
  component: RootComponent,
})

function RootComponent() {
  return (
    <TooltipProvider delayDuration={200}>
      <Outlet />
      <Toaster />
    </TooltipProvider>
  )
}
