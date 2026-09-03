import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DataTable } from '@/components/data-table'
import { ListMeta } from '@/components/list-meta'
import { PageHeader } from '@/components/page-header'
import { ErrorState, TableSkeleton } from '@/components/query-state'
import { AdminUnavailable } from '@/components/write-gate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toastApiError } from '@/lib/api'
import { useAuthStore, useCanAdmin } from '@/lib/auth-store'
import { endpoints } from '@/lib/endpoints'
import { DEFAULT_PAGE_SIZE, pagingParams } from '@/lib/list'
import type { CreateUserRequest, DashboardUser, UserRole } from '@/lib/types'

export function UsersPage() {
  const { t } = useTranslation()
  const canAdmin = useCanAdmin()
  const me = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE)
  const [createOpen, setCreateOpen] = useState(false)

  const listQ = useQuery({
    queryKey: ['users', offset, limit],
    queryFn: () => endpoints.users(pagingParams(offset, limit)),
    enabled: canAdmin,
  })

  const disableMut = useMutation({
    mutationFn: (username: string) => endpoints.disableUser(username),
    onSuccess: async () => {
      toast.success(t('users.disabled'))
      await qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: toastApiError,
  })
  const enableMut = useMutation({
    mutationFn: (username: string) => endpoints.enableUser(username),
    onSuccess: async () => {
      toast.success(t('users.enabled'))
      await qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: toastApiError,
  })

  const columns = useMemo<ColumnDef<DashboardUser>[]>(
    () => [
      { accessorKey: 'username', header: t('common.username') },
      {
        accessorKey: 'role',
        header: t('users.role'),
        cell: ({ getValue }) => <RoleBadge role={String(getValue())} />,
      },
      {
        accessorKey: 'enabled',
        header: t('common.status'),
        cell: ({ getValue }) =>
          getValue() ? (
            <Badge variant="success">{t('users.enabledLabel')}</Badge>
          ) : (
            <Badge variant="secondary">{t('users.disabledLabel')}</Badge>
          ),
      },
      {
        id: 'actions',
        header: t('common.actions'),
        cell: ({ row }) => {
          const u = row.original
          const self = u.username === me?.username
          if (self) {
            return <span className="text-xs text-muted-foreground">{t('users.self')}</span>
          }
          return u.enabled ? (
            <Button size="sm" variant="outline" onClick={() => disableMut.mutate(u.username)}>
              {t('users.disable')}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => enableMut.mutate(u.username)}>
              {t('users.enable')}
            </Button>
          )
        },
      },
    ],
    [t, me?.username, disableMut, enableMut],
  )

  if (!canAdmin) {
    return (
      <div>
        <PageHeader title={t('users.title')} description={t('users.desc')} />
        <AdminUnavailable page={t('nav.users')} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('users.title')}
        description={t('users.desc')}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => void listQ.refetch()}>
              {t('common.refresh')}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              {t('users.create')}
            </Button>
          </>
        }
      />
      {listQ.isLoading ? (
        <TableSkeleton />
      ) : listQ.error ? (
        <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={listQ.data?.items ?? []}
          searchKey="username"
          hidePagination
          footer={
            listQ.data ? (
              <ListMeta
                page={listQ.data}
                onOffsetChange={setOffset}
                onLimitChange={(n) => {
                  setLimit(n)
                  setOffset(0)
                }}
              />
            ) : null
          }
        />
      )}
      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={async () => {
          await qc.invalidateQueries({ queryKey: ['users'] })
        }}
      />
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const { t } = useTranslation()
  const label =
    role === 'admin' ? t('auth.roleAdmin') : role === 'operator' ? t('auth.roleOperator') : t('auth.roleViewer')
  const variant = role === 'admin' ? 'success' : role === 'operator' ? 'default' : 'warning'
  return <Badge variant={variant}>{label}</Badge>
}

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => Promise<void>
}) {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('operator')
  const [busy, setBusy] = useState(false)

  function reset() {
    setUsername('')
    setPassword('')
    setRole('operator')
    setBusy(false)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error(t('auth.passwordTooShort'))
      return
    }
    setBusy(true)
    const body: CreateUserRequest = { username: username.trim(), password, role }
    try {
      await endpoints.createUser(body)
      toast.success(t('users.created', { username: body.username }))
      reset()
      onOpenChange(false)
      await onCreated()
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(false)
      setPassword('')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('users.create')}</DialogTitle>
          <DialogDescription>{t('users.createHint')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3" autoComplete="off">
          <div className="space-y-1.5">
            <Label htmlFor="new-user">{t('common.username')}</Label>
            <Input
              id="new-user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-pass">{t('auth.password')}</Label>
            <Input
              id="new-user-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('users.role')}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t('auth.roleAdmin')}</SelectItem>
                <SelectItem value="operator">{t('auth.roleOperator')}</SelectItem>
                <SelectItem value="viewer">{t('auth.roleViewer')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={busy || !username.trim()}>
              {busy ? t('common.loading') : t('users.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
