import { CheckCircle2, Info, X } from 'lucide-react'

export interface ToastMessage {
  id: number
  text: string
  tone?: 'success' | 'info'
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[]
  onDismiss: (id: number) => void
}) {
  return (
    <div className="no-print pointer-events-none fixed bottom-5 left-1/2 z-200 flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="card pointer-events-auto flex w-full items-center gap-3 px-3.5 py-2.5 shadow-xl"
          role="status"
        >
          {toast.tone === 'info' ? (
            <Info size={17} className="shrink-0 text-brand-500" />
          ) : (
            <CheckCircle2
              size={17}
              className="shrink-0 text-emerald-500 dark:text-emerald-400"
            />
          )}
          <span className="flex-1 text-sm text-ink-700 dark:text-ink-200">
            {toast.text}
          </span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="btn btn-icon h-6 w-6"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
