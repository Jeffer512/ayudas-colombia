import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, MapPin } from 'lucide-react'
import {
  HELP_ORG_CATEGORY_LABELS,
  REQUEST_TYPE_LABELS,
  TRANSPORT_LABELS,
  URGENCY_META,
} from '../lib/constants'
import { formatDate } from '../lib/format'
import type { Request } from '../lib/types'
import StatusBadge from './StatusBadge'
import HelpRequestForm from './HelpRequestForm'
import Button from './ui/Button'
import Modal from './ui/Modal'
import { REQUEST_STATUS_META } from '../lib/constants'

export default function RequestCard({ request }: { request: Request }) {
  const [showHelp, setShowHelp] = useState(false)
  const typeLabel = REQUEST_TYPE_LABELS[request.type] ?? request.type
  const urgency = URGENCY_META[request.urgency] ?? {
    label: request.urgency,
    color: 'var(--fg-subtle)',
  }
  const canOfferHelp = request.status === 'open' && request.isOwner !== true

  return (
    <div className="rounded-lg border border-border bg-surface transition duration-fast hover:border-strong hover:shadow-sm">
      <Link to={`/pedido/${request.id}`} className="block p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={request.status} meta={REQUEST_STATUS_META} />
          {request.organization && (
            <span className="inline-block rounded-full bg-primary-muted px-2 py-0.5 text-xs font-medium text-primary">
              {HELP_ORG_CATEGORY_LABELS[request.organization.category] ??
                request.organization.category}{' '}
              · {request.organization.name}
            </span>
          )}
          <span className="text-xs text-fg-muted">
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

        <h2 className="mt-2 font-semibold text-fg">{request.title}</h2>
        {request.photo && (
          <img
            src={request.photo}
            alt={`Foto de: ${request.title}`}
            className="mt-2 h-20 w-20 rounded-md border border-border object-cover"
          />
        )}
        {request.description && (
          <p className="mt-1 line-clamp-2 text-sm text-fg-muted">
            {request.description}
          </p>
        )}

        {request.items.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {request.items.slice(0, 5).map((item) => (
              <span
                key={item}
                className="inline-block rounded-full bg-surface-2 px-2 py-0.5 text-xs text-fg-muted"
              >
                {item}
              </span>
            ))}
            {request.items.length > 5 && (
              <span className="text-xs text-fg-muted">
                +{request.items.length - 5} más
              </span>
            )}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
          {request.transport && (
            <span className="inline-block rounded-full bg-surface-2 px-2 py-0.5">
              {TRANSPORT_LABELS[request.transport]}
            </span>
          )}
          {request.helpers > 0 && (
            <span className="inline-block rounded-full bg-accent-muted px-2 py-0.5 font-medium text-accent-hover">
              {request.helpers === 1
                ? '1 persona está ayudando'
                : `${request.helpers} personas están ayudando`}
            </span>
          )}
          {request.address && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} aria-hidden="true" />
              {request.address}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={12} aria-hidden="true" />
            {formatDate(request.createdAt)}
          </span>
        </div>
      </Link>

      {canOfferHelp && (
        <div className="border-t border-border px-4 py-3">
          <Button onClick={() => setShowHelp(true)} className="w-full sm:w-auto">
            Voy a ayudar
          </Button>
        </div>
      )}

      {showHelp && (
        <Modal title="Voy a ayudar" onClose={() => setShowHelp(false)}>
          <HelpRequestForm
            request={request}
            onSuccess={() => setShowHelp(false)}
            defaultOpen
          />
        </Modal>
      )}
    </div>
  )
}