import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}

export default function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center">
      {icon && (
        <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
          {icon}
        </span>
      )}
      <p className="font-medium text-fg">{title}</p>
      {hint && <p className="max-w-md text-sm text-fg-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}