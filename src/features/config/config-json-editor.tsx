import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { collectSecretFields, parseJsonObject, prettyJson } from '@/lib/config'
import { cn } from '@/lib/utils'

export function ConfigJsonEditor({
  value,
  onChange,
  readOnly,
  minRows = 18,
}: {
  value: string
  onChange: (next: string) => void
  readOnly?: boolean
  minRows?: number
}) {
  const { t } = useTranslation()
  const parsed = useMemo(() => parseJsonObject(value), [value])
  const secrets = parsed.ok ? collectSecretFields(parsed.value) : []
  const lines = value.split('\n').length

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {secrets.length === 0 ? (
          <span className="text-[11px] text-muted-foreground">{t('config.noSecrets')}</span>
        ) : (
          secrets.map((s) => (
            <Badge
              key={s.path}
              variant={s.redacted ? 'destructive' : 'warning'}
              className="max-w-full font-mono"
              title={s.path}
            >
              {s.path}
              {s.redacted ? ` = ${t('config.redacted')}` : ''}
            </Badge>
          ))
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        spellCheck={false}
        aria-invalid={parsed.ok ? undefined : true}
        className={cn(
          'min-h-72 resize-y font-mono text-xs leading-5',
          !parsed.ok && 'border-destructive focus-visible:ring-destructive/40',
          readOnly && 'bg-muted/40',
        )}
        rows={Math.max(minRows, Math.min(lines + 2, 32))}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          {parsed.ok ? (
            <span>{t('config.jsonOk', { lines, secrets: secrets.length })}</span>
          ) : (
            <span className="text-destructive">
              {parsed.error === 'object' ? t('config.jsonObject') : t('config.jsonInvalid', { error: parsed.error })}
            </span>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!parsed.ok}
          onClick={() => onChange(prettyJson(parsed.ok ? parsed.value : {}))}
        >
          {t('config.format')}
        </Button>
      </div>
    </div>
  )
}
