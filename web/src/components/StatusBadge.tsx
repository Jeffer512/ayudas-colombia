import { STATUS_META } from '../lib/constants'
import type { Status } from '../lib/types'

export default function StatusBadge({ status }: { status: Status }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    badgeClass: 'bg-gray-100 text-gray-700',
  }
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  )
}