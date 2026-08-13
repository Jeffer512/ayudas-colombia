import { ACOPIO_STATUS_META } from '../lib/constants'
import type { AcopioStatus } from '../lib/types'

export default function AcopioStatusBadge({
  status,
}: {
  status: AcopioStatus
}) {
  const meta = ACOPIO_STATUS_META[status] ?? {
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