import { Link } from 'react-router-dom'
import { AVISO_STATUS_META, AVISO_TYPE_LABELS, URGENCY_META } from '../lib/constants'
import { formatDate } from '../lib/format'
import type { Aviso } from '../lib/types'
import StatusBadge from './StatusBadge'

export default function AvisoCard({ aviso }: { aviso: Aviso }) {
  const typeLabel = AVISO_TYPE_LABELS[aviso.type] ?? aviso.type
  const urgency = URGENCY_META[aviso.urgency] ?? {
    label: aviso.urgency,
    color: 'var(--fg-subtle)',
  }

  return (
    <Link
      to={`/aviso/${aviso.id}`}
      className="block rounded-lg border border-line bg-surface p-4 shadow-sm transition hover:border-sky-400 hover:shadow"
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={aviso.status} meta={AVISO_STATUS_META} />
        <span className="text-xs text-text-muted">
          {typeLabel} · {aviso.city.name}
        </span>
        <span
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium"
          style={{ color: urgency.color }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: urgency.color }}
          />
          Urgencia {urgency.label}
        </span>
      </div>

      <h2 className="mt-2 font-semibold text-text-main">{aviso.title}</h2>
      {aviso.description && (
        <p className="mt-1 line-clamp-2 text-sm text-text-muted">
          {aviso.description}
        </p>
      )}

      <div className="mt-2 text-xs text-text-muted">
        {aviso.marks > 0 && (
          <span className="mr-2 inline-block rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">
            {aviso.marks} {aviso.marks === 1 ? 'marca' : 'marcas'} de desactualizado
          </span>
        )}
        <span>
          {aviso.address ? `${aviso.address} · ` : null}
          {formatDate(aviso.createdAt)}
        </span>
      </div>
    </Link>
  )
}