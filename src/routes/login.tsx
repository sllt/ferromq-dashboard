import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginPage } from '@/features/login/login-page'
import { useAuthStore } from '@/lib/auth-store'

type LoginSearch = {
  redirect?: string
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: () => {
    if (useAuthStore.getState().user) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})
