interface StatusBadgeProps {
  status: string
  meta: Record<string, { label: string; badgeClass: string }>
}

export default function StatusBadge({ status, meta }: StatusBadgeProps) {
  const item = meta[status] ?? {
    label: status,
    badgeClass: 'bg-surface-2 text-fg-muted',
  }
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.badgeClass}`}
    >
      {item.label}
    </span>
  )
}
