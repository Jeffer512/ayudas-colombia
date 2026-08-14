import { Link } from 'react-router-dom'
import {
  HELP_ORG_CATEGORY_LABELS,
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
      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-400 hover:shadow"
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={org.status} meta={HELP_ORG_STATUS_META} />
        <span className="inline-block rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
          {HELP_ORG_CATEGORY_LABELS[org.category] ?? org.category}
        </span>
        <span className="text-xs text-slate-500">
          {HELP_ORG_TYPE_LABELS[org.type] ?? org.type} · {org.city.name}
        </span>
      </div>

      <h2 className="mt-2 font-semibold text-slate-900">{org.name}</h2>
      {org.description && (
        <p className="mt-1 line-clamp-2 text-sm text-slate-600">
          {org.description}
        </p>
      )}

      <div className="mt-2 text-xs text-slate-500">
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