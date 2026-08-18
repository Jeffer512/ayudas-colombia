import { Link } from 'react-router-dom'
import { CalendarDays, MapPin } from 'lucide-react'
import { OFFER_STATUS_META, OFFER_TYPE_LABELS, TRANSPORT_LABELS } from '../lib/constants'
import { formatDate } from '../lib/format'
import type { Offer } from '../lib/types'
import StatusBadge from './StatusBadge'

export default function OfferCard({ offer }: { offer: Offer }) {
  const typeLabel = OFFER_TYPE_LABELS[offer.type] ?? offer.type

  return (
    <Link
      to={`/oferta/${offer.id}`}
      className="block rounded-lg border border-border bg-surface p-4 transition duration-fast hover:border-strong hover:shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={offer.status} meta={OFFER_STATUS_META} />
        <span className="text-xs text-fg-muted">
          {typeLabel} · {offer.city.name}
        </span>
        {offer.type === 'volunteers_offered' &&
          offer.audience &&
          offer.audience !== 'public' && (
            <span className="inline-block rounded-full bg-surface-2 px-2 py-0.5 text-xs text-fg-muted">
              {offer.audience === 'orgs' ? 'Solo organizaciones' : 'Solo usuarios'}
            </span>
          )}
      </div>

      <h2 className="mt-2 font-semibold text-fg">{offer.title}</h2>
      {offer.description && (
        <p className="mt-1 line-clamp-2 text-sm text-fg-muted">
          {offer.description}
        </p>
      )}

      {offer.items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {offer.items.slice(0, 5).map((item) => (
            <span
              key={item}
              className="inline-block rounded-full bg-surface-2 px-2 py-0.5 text-xs text-fg-muted"
            >
              {item}
            </span>
          ))}
          {offer.items.length > 5 && (
            <span className="text-xs text-fg-muted">
              +{offer.items.length - 5} más
            </span>
          )}
        </div>
      )}

      {offer.zone && (
        <p className="mt-2 text-xs text-fg-muted">Zona: {offer.zone}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
        {offer.transport && (
          <span className="inline-block rounded-full bg-accent-muted px-2 py-0.5 font-medium text-accent-hover">
            {TRANSPORT_LABELS[offer.transport]}
          </span>
        )}
        {offer.address && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} aria-hidden="true" />
            {offer.address}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <CalendarDays size={12} aria-hidden="true" />
          {formatDate(offer.createdAt)}
        </span>
      </div>
    </Link>
  )
}