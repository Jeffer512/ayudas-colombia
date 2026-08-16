import { Link } from 'react-router-dom'
import {
  HELP_ORG_CATEGORY_LABELS,
  REQUEST_TYPE_LABELS,
  TRANSPORT_LABELS,
  URGENCY_META,
} from '../lib/constants'
import { formatDate } from '../lib/format'
import type { Request } from '../lib/types'
import StatusBadge from './StatusBadge'
import { REQUEST_STATUS_META } from '../lib/constants'

export default function RequestCard({ request }: { request: Request }) {
  const typeLabel = REQUEST_TYPE_LABELS[request.type] ?? request.type
  const urgency = URGENCY_META[request.urgency] ?? {
    label: request.urgency,
    color: '#64748b',
  }

  return (
    <Link
      to={`/pedido/${request.id}`}
      className="block rounded-lg border border-line bg-surface p-4 shadow-sm transition hover:border-rose-400 dark:hover:border-rose-700 hover:shadow"
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={request.status} meta={REQUEST_STATUS_META} />
        {request.organization && (
          <span className="inline-block rounded-full bg-teal-100 dark:bg-teal-950/40 px-2 py-0.5 text-xs font-medium text-teal-800 dark:text-teal-300">
            {HELP_ORG_CATEGORY_LABELS[request.organization.category] ??
              request.organization.category}{' '}
            · {request.organization.name}
          </span>
        )}
        <span className="text-xs text-text-muted">
          {typeLabel} · {request.city.name}
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

      <h2 className="mt-2 font-semibold text-text-main">{request.title}</h2>
      {request.photo && (
        <img
          src={request.photo}
          alt={`Foto de: ${request.title}`}
          className="mt-2 h-20 w-20 rounded-md border border-line object-cover"
        />
      )}
      <p className="mt-1 line-clamp-2 text-sm text-text-muted">
        {request.description}
      </p>

      {request.items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {request.items.slice(0, 5).map((item) => (
            <span
              key={item}
              className="inline-block rounded-full bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 text-xs text-rose-700 dark:text-rose-300"
            >
              {item}
            </span>
          ))}
          {request.items.length > 5 && (
            <span className="text-xs text-text-muted">
              +{request.items.length - 5} más
            </span>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
        {request.transport && (
          <span className="inline-block rounded-full bg-page dark:bg-white/10 px-2 py-0.5">
            {TRANSPORT_LABELS[request.transport]}
          </span>
        )}
        {request.helpers > 0 && (
          <span className="inline-block rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 font-medium text-emerald-800 dark:text-emerald-300">
            {request.helpers === 1
              ? '1 persona está ayudando'
              : `${request.helpers} personas están ayudando`}
          </span>
        )}
        <span>
          {request.address ? `${request.address} · ` : null}
          {formatDate(request.createdAt)}
        </span>
      </div>
    </Link>
  )
}