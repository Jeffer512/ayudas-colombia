import { Link } from 'react-router-dom'
import {
  HELP_ORG_CATEGORY_LABELS,
  HELP_ORG_MANAGED_LABEL,
  HELP_ORG_TYPE_LABELS,
  HELP_ORG_STATUS_META,
} from '../lib/constants'
import { formatDate } from '../lib/format'
import type { HelpOrg } from '../lib/types'
import OrgInventory from './OrgInventory'
import StatusBadge from './StatusBadge'

export default function HelpOrgCard({ org }: { org: HelpOrg }) {
  return (
    <Link
      to={`/organizacion/${org.id}`}
      className="block rounded-lg border border-line bg-surface p-4 shadow-sm transition hover:border-teal-400 dark:hover:border-teal-700 hover:shadow"
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={org.status} meta={HELP_ORG_STATUS_META} />
        <span className="inline-block rounded-full bg-teal-100 dark:bg-teal-950/40 px-2 py-0.5 text-xs font-medium text-teal-800 dark:text-teal-300">
          {HELP_ORG_CATEGORY_LABELS[org.category] ?? org.category}
        </span>
        {org.managed && (
          <span className="inline-block rounded-full bg-sky-100 dark:bg-sky-950/40 px-2 py-0.5 text-xs font-medium text-sky-800 dark:text-sky-300">
            {HELP_ORG_MANAGED_LABEL}
          </span>
        )}
        <span className="text-xs text-text-muted">
          {HELP_ORG_TYPE_LABELS[org.type] ?? org.type} · {org.city.name}
        </span>
      </div>

      <h2 className="mt-2 font-semibold text-text-main">{org.name}</h2>
      {org.description && (
        <p className="mt-1 line-clamp-2 text-sm text-text-muted">
          {org.description}
        </p>
      )}

      <div className="mt-2 text-xs text-text-muted">
        {org.address ? `${org.address} · ` : null}
        {org.hours ? `Horario: ${org.hours} · ` : null}
        Publicado {formatDate(org.createdAt)}
      </div>

      {org.items && org.items.length > 0 && (
        <OrgInventory items={org.items} limit={5} />
      )}
    </Link>
  )
}