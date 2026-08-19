import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import Map from '../components/Map'
import ReportButton from '../components/ReportButton'
import RequestCard from '../components/RequestCard'
import {
  HELP_ORG_CATEGORY_LABELS,
  HELP_ORG_MANAGED_LABEL,
  HELP_ORG_TYPE_LABELS,
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
      <div className="rounded-lg border border-danger-muted bg-danger-muted p-6 text-center text-danger">
        <p className="font-medium">No encontramos esta organización</p>
        <Link to="/red-de-ayudas" className="mt-2 inline-block text-sm underline">
          Volver a la red de ayudas
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/red-de-ayudas" className="text-sm text-org-hover hover:underline">
        ← Volver a la red de ayudas
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-block rounded-full bg-org-muted px-2 py-0.5 text-xs font-medium text-org-hover">
          {HELP_ORG_CATEGORY_LABELS[org.category] ?? org.category}
        </span>
        {org.managed && (
          <span className="inline-block rounded-full bg-primary-muted px-2 py-0.5 text-xs font-medium text-primary">
            {HELP_ORG_MANAGED_LABEL}
          </span>
        )}
        <span className="text-sm text-fg-muted">
          {HELP_ORG_TYPE_LABELS[org.type] ?? org.type} · {org.city.name}
        </span>
      </div>

      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-fg">
        {org.name}
      </h1>

      {org.description && (
        <p className="mt-3 whitespace-pre-line text-fg-muted">{org.description}</p>
      )}

      {!org.managed && (
        <p className="mt-3 rounded-md border border-border bg-surface p-3 text-sm text-fg-muted">
          Publicada por un voluntario de la comunidad. Si trabajas aquí, puedes
          vincularte con tu cuenta para gestionarla.
        </p>
      )}

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {org.address && (
          <div>
            <dt className="font-medium text-fg-muted">Dirección</dt>
            <dd className="text-fg">{org.address}</dd>
          </div>
        )}
        {org.hours && (
          <div>
            <dt className="font-medium text-fg-muted">Horario</dt>
            <dd className="text-fg">{org.hours}</dd>
          </div>
        )}
        {org.accepts && (
          <div>
            <dt className="font-medium text-fg-muted">¿Qué reciben?</dt>
            <dd className="text-fg">{org.accepts}</dd>
          </div>
        )}
        {org.contactName && (
          <div>
            <dt className="font-medium text-fg-muted">Persona responsable</dt>
            <dd className="text-fg">{org.contactName}</dd>
          </div>
        )}
        {org.contactPhone && (
          <div>
            <dt className="font-medium text-fg-muted">Teléfono</dt>
            <dd className="text-fg">
              <a href={`tel:${org.contactPhone}`} className="text-org-hover">
                {org.contactPhone}
              </a>
            </dd>
          </div>
        )}
        <div>
          <dt className="font-medium text-fg-muted">Publicado</dt>
          <dd className="text-fg">{formatDate(org.createdAt)}</dd>
        </div>
      </dl>

      <div className="mt-3">
        <ReportButton kind="org" targetId={org.id} />
      </div>

      {org.lat !== null && org.lng !== null && (
        <div className="mt-4">
          <Map
            center={{ lat: org.lat, lng: org.lng }}
            marker={{ lat: org.lat, lng: org.lng }}
          />
        </div>
      )}

      {org.items && org.items.length > 0 && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-fg-muted">
            Inventario de la organización
          </h2>
          <OrgInventory items={org.items} />
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-fg-muted">
          Pedidos publicados por esta organización
        </h2>
        {requestsQuery.isPending && (
          <p className="py-6 text-center text-sm text-fg-muted" role="status">
            Cargando pedidos…
          </p>
        )}
        {!requestsQuery.isPending && orgRequests.length === 0 && (
          <p className="py-6 text-center text-sm text-fg-muted">
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