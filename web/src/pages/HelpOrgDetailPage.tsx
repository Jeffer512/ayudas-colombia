import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import Map from '../components/Map'
import RequestCard from '../components/RequestCard'
import StatusBadge from '../components/StatusBadge'
import {
  HELP_ORG_CATEGORY_LABELS,
  HELP_ORG_TYPE_LABELS,
  HELP_ORG_STATUS_META,
} from '../lib/constants'
import { formatDate } from '../lib/format'
import OrgInventory from '../components/OrgInventory'

export default function HelpOrgDetailPage() {
  const { id = '' } = useParams()

  const orgQuery = useQuery({
    queryKey: ['help-org', id],
    queryFn: () => api.helpOrg(id),
  })

  const requestsQuery = useQuery({
    queryKey: ['requests', { org: id }],
    queryFn: () => api.requests({ org: id }),
    enabled: !!orgQuery.data,
  })

  const org = orgQuery.data
  const orgRequests = requestsQuery.data?.requests ?? []

  if (orgQuery.isPending) {
    return <p role="status">Cargando organización…</p>
  }

  if (orgQuery.isError || !org) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <p className="font-medium">No encontramos esta organización</p>
        <Link to="/red-de-ayudas" className="mt-2 inline-block text-sm underline">
          Volver a la red de ayudas
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/red-de-ayudas" className="text-sm text-teal-700 hover:underline">
        ← Volver a la red de ayudas
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={org.status} meta={HELP_ORG_STATUS_META} />
        <span className="inline-block rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
          {HELP_ORG_CATEGORY_LABELS[org.category] ?? org.category}
        </span>
        <span className="text-sm text-slate-500">
          {HELP_ORG_TYPE_LABELS[org.type] ?? org.type} · {org.city.name}
        </span>
      </div>

      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
        {org.name}
      </h1>

      {org.description && (
        <p className="mt-3 whitespace-pre-line text-slate-700">{org.description}</p>
      )}

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {org.address && (
          <div>
            <dt className="font-medium text-slate-500">Dirección</dt>
            <dd className="text-slate-800">{org.address}</dd>
          </div>
        )}
        {org.hours && (
          <div>
            <dt className="font-medium text-slate-500">Horario</dt>
            <dd className="text-slate-800">{org.hours}</dd>
          </div>
        )}
        {org.accepts && (
          <div>
            <dt className="font-medium text-slate-500">¿Qué reciben?</dt>
            <dd className="text-slate-800">{org.accepts}</dd>
          </div>
        )}
        {org.contactName && (
          <div>
            <dt className="font-medium text-slate-500">Persona responsable</dt>
            <dd className="text-slate-800">{org.contactName}</dd>
          </div>
        )}
        {org.contactPhone && (
          <div>
            <dt className="font-medium text-slate-500">Teléfono</dt>
            <dd className="text-slate-800">
              <a href={`tel:${org.contactPhone}`} className="text-teal-700">
                {org.contactPhone}
              </a>
            </dd>
          </div>
        )}
        <div>
          <dt className="font-medium text-slate-500">Publicado</dt>
          <dd className="text-slate-800">{formatDate(org.createdAt)}</dd>
        </div>
      </dl>

      {org.lat !== null && org.lng !== null && (
        <div className="mt-4">
          <Map
            center={{ lat: org.lat, lng: org.lng }}
            marker={{ lat: org.lat, lng: org.lng }}
          />
        </div>
      )}

      {org.items && org.items.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700">
            Inventario de la organización
          </h2>
          <OrgInventory items={org.items} />
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700">
          Pedidos publicados por esta organización
        </h2>
        {requestsQuery.isPending && (
          <p className="py-6 text-center text-sm text-slate-500" role="status">
            Cargando pedidos…
          </p>
        )}
        {!requestsQuery.isPending && orgRequests.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">
            Esta organización no ha publicado pedidos todavía.
          </p>
        )}
        {orgRequests.length > 0 && (
          <ul className="mt-3 space-y-3">
            {orgRequests.map((request) => (
              <li key={request.id}>
                <RequestCard request={request} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}