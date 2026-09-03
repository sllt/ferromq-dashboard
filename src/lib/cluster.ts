export type ClusterNodeError = {
  ok: false
  node_id?: number
  node?: number | { id?: number; name?: string }
  error: string
  plugins?: unknown[]
}

export function isClusterNodeError(value: unknown): value is ClusterNodeError {
  if (!value || typeof value !== 'object') return false
  const rec = value as ClusterNodeError
  return rec.ok === false && typeof rec.error === 'string'
}

export type ClusterFailure = { key: string; error: string }

export function partitionCluster<T>(
  items: Array<T | ClusterNodeError | string> | T | ClusterNodeError | null | undefined,
): { ok: T[]; errors: ClusterFailure[] } {
  const list = items == null ? [] : Array.isArray(items) ? items : [items]
  const ok: T[] = []
  const errors: ClusterFailure[] = []
  for (const item of list) {
    if (typeof item === 'string') {
      errors.push({ key: item, error: item })
      continue
    }
    if (isClusterNodeError(item)) {
      const nodeRef = item.node
      const id =
        item.node_id ??
        (typeof nodeRef === 'number' ? nodeRef : nodeRef && typeof nodeRef === 'object' ? nodeRef.id : undefined)
      errors.push({ key: String(id ?? item.error), error: item.error })
      continue
    }
    ok.push(item)
  }
  return { ok, errors }
}
