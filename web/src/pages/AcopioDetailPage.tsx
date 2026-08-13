import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import AcopioStatusBadge from '../components/AcopioStatusBadge'
import Map from '../components/Map'
import { ACOPIO_TYPE_LABELS } from '../lib/constants'
import { formatDate } from '../lib/format'

export default function AcopioDetailPage() {
  const { id = '' } = useParams()

  const { data: acopio, isPending, isError } = useQuery({
    queryKey: ['acopio', id],
    queryFn: () => api.acopio(id),
  })

  if (isPending) {
    return <p role="status">Cargando centro de acopio…</p>
  }

  if (isError || !acopio) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <p className="font-medium">No encontramos este centro de acopio</p>
        <Link to="/centros-de-acopio" className="mt-2 inline-block text-sm underline">
          Volver a centros de acopio
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/centros-de-acopio" className="text-sm text-teal-700 hover:underline">
        ← Volver a centros de acopio
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <AcopioStatusBadge status={acopio.status} />
        <span className="text-sm text-slate-500">
          {ACOPIO_TYPE_LABELS[acopio.type] ?? acopio.type} · {acopio.city.name}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {acopio.name}
        </h1>
        <Link
          to="/nuevo-centro"
          className="text-sm text-teal-700 hover:underline"
        >
          ¿Tienes otro centro?
        </Link>
      </div>

      {acopio.description && (
        <p className="mt-3 whitespace-pre-line text-slate-700">
          {acopio.description}
        </p>
      )}

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {acopio.address && (
          <div>
            <dt className="font-medium text-slate-500">Dirección</dt>
            <dd className="text-slate-800">{acopio.address}</dd>
          </div>
        )}
        {acopio.hours && (
          <div>
            <dt className="font-medium text-slate-500">Horario</dt>
            <dd className="text-slate-800">{acopio.hours}</dd>
          </div>
        )}
        {acopio.accepts && (
          <div>
            <dt className="font-medium text-slate-500">¿Qué reciben?</dt>
            <dd className="text-slate-800">{acopio.accepts}</dd>
          </div>
        )}
        {acopio.contactName && (
          <div>
            <dt className="font-medium text-slate-500">Persona responsable</dt>
            <dd className="text-slate-800">{acopio.contactName}</dd>
          </div>
        )}
        {acopio.contactPhone && (
          <div>
            <dt className="font-medium text-slate-500">Teléfono</dt>
            <dd className="text-slate-800">
              <a href={`tel:${acopio.contactPhone}`} className="text-teal-700">
                {acopio.contactPhone}
              </a>
            </dd>
          </div>
        )}
        <div>
          <dt className="font-medium text-slate-500">Publicado</dt>
          <dd className="text-slate-800">{formatDate(acopio.createdAt)}</dd>
        </div>
      </dl>

      {acopio.lat !== null && acopio.lng !== null && (
        <div className="mt-4">
          <Map
            center={{ lat: acopio.lat, lng: acopio.lng }}
            marker={{ lat: acopio.lat, lng: acopio.lng }}
          />
        </div>
      )}
    </div>
  )
}