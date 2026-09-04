import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Copy } from 'lucide-react'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { useCanAdmin } from '@/lib/auth-store'
import { endpoints } from '@/lib/endpoints'
import { DEFAULT_PAGE_SIZE, pagingParams } from '@/lib/list'
import { formatUnixTime } from '@/lib/session-user'
import type { ApiKeyCreated, ApiKeyInfo, CreateApiKeyRequest, UserRole } from '@/lib/types'

export function ApiKeysPage() {
  const { t } = useTranslation()
  const canAdmin = useCanAdmin()
  const qc = useQueryClient()
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE)
  const [createOpen, setCreateOpen] = useState(false)
  const [created, setCreated] = useState<ApiKeyCreated | null>(null)
  const [revokeId, setRevokeId] = useState<string | null>(null)

  const listQ = useQuery({
    queryKey: ['api-keys', offset, limit],
    queryFn: () => endpoints.apiKeys(pagingParams(offset, limit)),
    enabled: canAdmin,
  })

  const revokeMut = useMutation({
    mutationFn: (id: string) => endpoints.deleteApiKey(id),
    onSuccess: async () => {
      toast.success(t('apikeys.revoked'))
      await qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: toastApiError,
  })

  const columns = useMemo<ColumnDef<ApiKeyInfo>[]>(
    () => [
      { accessorKey: 'name', header: t('apikeys.name') },
      { accessorKey: 'id', header: t('apikeys.id') },
      {
        accessorKey: 'role',
        header: t('users.role'),
        cell: ({ getValue }) => {
          const role = String(getValue())
          const label =
            role === 'admin' ? t('auth.roleAdmin') : role === 'operator' ? t('auth.roleOperator') : t('auth.roleViewer')
          return (
            <Badge variant={role === 'admin' ? 'success' : role === 'operator' ? 'default' : 'warning'}>{label}</Badge>
          )
        },
      },
      { accessorKey: 'created_by', header: t('apikeys.createdBy') },
      {
        accessorKey: 'created_at',
        header: t('apikeys.createdAt'),
        cell: ({ getValue }) => formatUnixTime(getValue() as number),
      },
      {
        accessorKey: 'last_used_at',
        header: t('apikeys.lastUsed'),
        cell: ({ getValue }) => formatUnixTime(getValue() as number | null),
      },
      {
        id: 'actions',
        header: t('common.actions'),
        cell: ({ row }) => (
          <Button size="sm" variant="destructive" onClick={() => setRevokeId(row.original.id)}>
            {t('apikeys.revoke')}
          </Button>
        ),
      },
    ],
    [t],
  )

  if (!canAdmin) {
    return (
      <div>
        <PageHeader title={t('apikeys.title')} description={t('apikeys.desc')} />
        <AdminUnavailable page={t('nav.apikeys')} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('apikeys.title')}
        description={t('apikeys.desc')}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => void listQ.refetch()}>
              {t('common.refresh')}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              {t('apikeys.create')}
            </Button>
          </>
        }
      />
      <p className="mb-3 text-xs text-muted-foreground">{t('apikeys.listHint')}</p>
      {listQ.isLoading ? (
        <TableSkeleton />
      ) : listQ.error ? (
        <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={listQ.data?.items ?? []}
          searchKey="name"
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

      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={async (key) => {
          setCreated(key)
          await qc.invalidateQueries({ queryKey: ['api-keys'] })
        }}
      />

      <Dialog open={!!created} onOpenChange={(o) => !o && setCreated(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('apikeys.secretTitle')}</DialogTitle>
            <DialogDescription>{t('apikeys.secretHint')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t('apikeys.secret')}</Label>
            <div className="flex gap-2">
              <Input readOnly value={created?.secret ?? ''} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={async () => {
                  if (!created?.secret) return
                  await navigator.clipboard.writeText(created.secret)
                  toast.success(t('common.copied'))
                }}
              >
                <Copy />
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setCreated(null)}>{t('common.close')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeId} onOpenChange={(o) => !o && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('apikeys.revoke')}</AlertDialogTitle>
            <AlertDialogDescription>{t('apikeys.revokeConfirm', { id: revokeId })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (revokeId) revokeMut.mutate(revokeId)
                setRevokeId(null)
              }}
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CreateKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (key: ApiKeyCreated) => Promise<void>
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('operator')
  const [busy, setBusy] = useState(false)

  function reset() {
    setName('')
    setRole('operator')
    setBusy(false)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const body: CreateApiKeyRequest = { name: name.trim(), role }
    try {
      const created = await endpoints.createApiKey(body)
      reset()
      onOpenChange(false)
      await onCreated(created)
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(false)
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
          <DialogTitle>{t('apikeys.create')}</DialogTitle>
          <DialogDescription>{t('apikeys.createHint')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="key-name">{t('apikeys.name')}</Label>
            <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} required />
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
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? t('common.loading') : t('apikeys.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
