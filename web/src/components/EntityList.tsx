import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import EmptyState from './ui/EmptyState'

interface EntityListProps {
  children?: ReactNode
  empty: boolean
  emptyTitle: string
  emptyHint: string
  emptyAction?: ReactNode
}

export default function EntityList({
  children,
  empty,
  emptyTitle,
  emptyHint,
  emptyAction,
}: EntityListProps) {
  if (empty) {
    return (
      <EmptyState
        icon={<Inbox size={22} aria-hidden="true" />}
        title={emptyTitle}
        hint={emptyHint}
        action={emptyAction}
      />
    )
  }
  return <ul className="flex flex-col gap-3">{children}</ul>
}