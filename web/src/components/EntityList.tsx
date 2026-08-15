import type { ReactNode } from 'react'

interface EntityListProps {
  children?: ReactNode
  empty: boolean
  emptyTitle: string
  emptyHint: string
}

export default function EntityList({
  children,
  empty,
  emptyTitle,
  emptyHint,
}: EntityListProps) {
  if (empty) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-surface p-8 text-center text-text-muted">
        <p className="font-medium">{emptyTitle}</p>
        <p className="mt-1 text-sm">{emptyHint}</p>
      </div>
    )
  }
  return <ul className="flex flex-col gap-3">{children}</ul>
}