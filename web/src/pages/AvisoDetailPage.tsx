import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import Map from '../components/Map'
import ReportButton from '../components/ReportButton'
import ReporterContact from '../components/ReporterContact'
import StatusBadge from '../components/StatusBadge'
import {
  AVISO_STATUS_META,
  AVISO_TYPE_LABELS,
  URGENCY_META,
} from '../lib/constants'
import { formatDate } from '../lib/format'

const MARK_THRESHOLD = 3

export default function AvisoDetailPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()

  const { data: aviso, isPending, isError } = useQuery({
    queryKey: ['aviso', id],
    queryFn: () => api.aviso(id),
  })

  const mutation = useMutation({
    mutationFn: () => api.markAviso(id, { markerId: api.markerId() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aviso', id] })
      queryClient.invalidateQueries({ queryKey: ['avisos'] })
    },
  })

  if (isPending) {
    return <p role="status">Cargando aviso…</p>
  }

  if (isError || !aviso) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <p className="font-medium">No encontramos este aviso</p>
        <Link to="/" className="mt-2 inline-block text-sm underline">
          Volver al mapa
        </Link>
      </div>
    )
  }

  const urgency = URGENCY_META[aviso.urgency] ?? {
    label: aviso.urgency,
    color: '#64748b',
  }
  const typeLabel = AVISO_TYPE_LABELS[aviso.type] ?? aviso.type
  const remaining = Math.max(0, MARK_THRESHOLD - aviso.marks)

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="text-sm text-sky-700 hover:underline">
        ← Volver al mapa
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={aviso.status} meta={AVISO_STATUS_META} />
        <span className="text-sm text-slate-500">
          {typeLabel} · {aviso.city.name}
        </span>
        <span
          className="ml-auto inline-flex items-center gap-1 text-sm font-medium"
          style={{ color: urgency.color }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: urgency.color }}
          />
          Urgencia {urgency.label}
        </span>
      </div>

      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
        {aviso.title}
      </h1>

      <p className="mt-3 whitespace-pre-line text-slate-700">
        {aviso.description}
      </p>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {aviso.address && (
          <div>
            <dt className="font-medium text-slate-500">Dirección</dt>
            <dd className="text-slate-800">{aviso.address}</dd>
          </div>
        )}
        <div>
          <dt className="font-medium text-slate-500">Publicado</dt>
          <dd className="text-slate-800">{formatDate(aviso.createdAt)}</dd>
        </div>
        <ReporterContact
          reporter={aviso.reporter}
          nameLabel="Informa"
          restricted={aviso.contactRestricted}
        />
      </dl>

      <div className="mt-3">
        <ReportButton kind="aviso" targetId={aviso.id} />
      </div>

      {aviso.lat !== null && aviso.lng !== null && (
        <div className="mt-4">
          <Map
            center={{ lat: aviso.lat, lng: aviso.lng }}
            marker={{ lat: aviso.lat, lng: aviso.lng }}
          />
        </div>
      )}

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">
          ¿Sigue siendo útil este aviso?
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {aviso.status === 'open' &&
            `Si la información ya no es válida, márcalo como desactualizado. Cuando ${remaining} ${remaining === 1 ? 'persona más lo' : 'personas más lo'} hagan, se cierra para todos.`}
          {aviso.status === 'closed' &&
            'Si la información sigue siendo válida, avísanos para que vuelva a estar vigente. Un solo voto lo reabre.'}
        </p>

        {mutation.isError && (
          <div
            role="alert"
            className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {(mutation.error as Error).message}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {aviso.status === 'open' ? (
            <>
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="rounded-md bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                Marcarlo como desactualizado
              </button>
              <span className="text-xs text-slate-500">
                {aviso.marks} de {MARK_THRESHOLD} marcas
              </span>
            </>
          ) : (
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
            >
              Aún vigente
            </button>
          )}
        </div>
      </section>
    </div>
  )
}