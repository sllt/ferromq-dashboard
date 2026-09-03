import { createFileRoute } from '@tanstack/react-router'
import { AclPage } from '@/features/acl/acl-page'

export const Route = createFileRoute('/_authenticated/acl')({
  component: AclPage,
})
