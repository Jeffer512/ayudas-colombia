import { Link } from 'react-router-dom'
import { CalendarDays, MapPin } from 'lucide-react'
import {
  HELP_ORG_CATEGORY_LABELS,
  HELP_ORG_MANAGED_LABEL,
  HELP_ORG_TYPE_LABELS,
} from '../lib/constants'
import { formatDate } from '../lib/format'
import type { HelpOrg } from '../lib/types'
import OrgInventory from './OrgInventory'

export default function HelpOrgCard({ org }: { org: HelpOrg }) {
  return (
    <Link
      to={`/organizacion/${org.id}`}
      className="block rounded-lg border border-border bg-surface p-4 transition duration-fast hover:border-strong hover:shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-block rounded-full bg-primary-muted px-2 py-0.5 text-xs font-medium text-primary">
          {HELP_ORG_CATEGORY_LABELS[org.category] ?? org.category}
        </span>
        {org.managed && (
          <span className="inline-block rounded-full bg-surface-2 px-2 py-0.5 text-xs text-fg-muted">
            {HELP_ORG_MANAGED_LABEL}
          </span>
        )}
        <span className="text-xs text-fg-muted">
          {HELP_ORG_TYPE_LABELS[org.type] ?? org.type} · {org.city.name}
        </span>
      </div>

      <h2 className="mt-2 font-semibold text-fg">{org.name}</h2>
      {org.description && (
        <p className="mt-1 line-clamp-2 text-sm text-fg-muted">
          {org.description}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
        {org.address && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} aria-hidden="true" />
            {org.address}
          </span>
        )}
        {org.hours && <span>Horario: {org.hours}</span>}
        <span className="inline-flex items-center gap-1">
          <CalendarDays size={12} aria-hidden="true" />
          Publicado {formatDate(org.createdAt)}
        </span>
      </div>

      {org.items && org.items.length > 0 && (
        <OrgInventory items={org.items} limit={5} />
      )}
    </Link>
  )
}