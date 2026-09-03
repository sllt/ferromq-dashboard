import { createFileRoute } from '@tanstack/react-router'
import { AuthProvidersPage } from '@/features/auth-providers/auth-providers-page'

export const Route = createFileRoute('/_authenticated/auth-providers')({
  component: AuthProvidersPage,
})
