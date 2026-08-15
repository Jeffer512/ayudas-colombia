import { Link } from 'react-router-dom'
import { OFFER_STATUS_META, OFFER_TYPE_LABELS, TRANSPORT_LABELS } from '../lib/constants'
import { formatDate } from '../lib/format'
import type { Offer } from '../lib/types'
import StatusBadge from './StatusBadge'

export default function OfferCard({ offer }: { offer: Offer }) {
  const typeLabel = OFFER_TYPE_LABELS[offer.type] ?? offer.type

  return (
    <Link
      to={`/oferta/${offer.id}`}
      className="block rounded-lg border border-line bg-surface p-4 shadow-sm transition hover:border-emerald-400 hover:shadow"
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={offer.status} meta={OFFER_STATUS_META} />
        <span className="text-xs text-text-muted">
          {typeLabel} · {offer.city.name}
        </span>
        {offer.type === 'volunteers_offered' &&
          offer.audience &&
          offer.audience !== 'public' && (
            <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
              {offer.audience === 'orgs' ? 'Solo organizaciones' : 'Solo usuarios'}
            </span>
          )}
      </div>

      <h2 className="mt-2 font-semibold text-text-main">{offer.title}</h2>
      <p className="mt-1 line-clamp-2 text-sm text-text-muted">
        {offer.description}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
        {offer.transport && (
          <span className="inline-block rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
            {TRANSPORT_LABELS[offer.transport]}
          </span>
        )}
        <span>
          {offer.address ? `${offer.address} · ` : null}
          {formatDate(offer.createdAt)}
        </span>
      </div>
    </Link>
  )
}