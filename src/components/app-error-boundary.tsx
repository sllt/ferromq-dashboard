import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import i18n from '@/lib/i18n'
import { Button } from '@/components/ui/button'

type FallbackProps = {
  error?: unknown
  onReset?: () => void
}

export function ErrorFallback({ error, onReset }: FallbackProps) {
  const message = error instanceof Error ? error.message : error != null ? String(error) : ''

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-svh flex-col items-center justify-center bg-background px-6 text-center"
    >
      <AlertCircle className="size-8 text-destructive" aria-hidden />
      <h1 className="mt-4 text-lg font-semibold">{i18n.t('crash.title')}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{i18n.t('crash.hint')}</p>
      {message ? (
        <pre className="mt-4 max-w-lg overflow-x-auto rounded-lg border bg-muted/50 px-3 py-2 text-left font-mono text-xs text-muted-foreground">
          {message}
        </pre>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {onReset ? (
          <Button type="button" variant="outline" onClick={onReset}>
            {i18n.t('crash.retry')}
          </Button>
        ) : null}
        <Button type="button" onClick={() => window.location.reload()}>
          {i18n.t('crash.reload')}
        </Button>
      </div>
    </main>
  )
}

type BoundaryState = { error: Error | null }

export class AppErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('FerroMQ dashboard crash', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={() => {
            this.setState({ error: null })
          }}
        />
      )
    }
    return this.props.children
  }
}
