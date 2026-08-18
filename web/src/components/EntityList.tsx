import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import EmptyState from './ui/EmptyState'

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
    return <EmptyState icon={<Inbox size={22} aria-hidden="true" />} title={emptyTitle} hint={emptyHint} />
  }
  return <ul className="flex flex-col gap-3">{children}</ul>
}