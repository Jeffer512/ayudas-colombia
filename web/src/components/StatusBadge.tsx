interface StatusBadgeProps {
  status: string
  meta: Record<string, { label: string; badgeClass: string }>
}

export default function StatusBadge({ status, meta }: StatusBadgeProps) {
  const item = meta[status] ?? {
    label: status,
    badgeClass: 'bg-gray-100 text-gray-700',
  }
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.badgeClass}`}
    >
      {item.label}
    </span>
  )
}
