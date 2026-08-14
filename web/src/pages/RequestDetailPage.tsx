import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import Map from '../components/Map'
import ReporterContact from '../components/ReporterContact'
import StatusBadge from '../components/StatusBadge'
import {
  REQUEST_STATUS_META,
  REQUEST_TYPE_LABELS,
  TRANSPORT_LABELS,
  URGENCY_META,
} from '../lib/constants'
import { formatDate } from '../lib/format'
import type { StatusUpdate } from '../lib/types'

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none'

type ActionMode = 'attend' | 'resolve' | null

export default function RequestDetailPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<ActionMode>(null)
  const [actorName, setActorName] = useState('')
  const [note, setNote] = useState('')
  const [resolveCode, setResolveCode] = useState('')

  const { data: request, isPending, isError } = useQuery({
    queryKey: ['request', id],
    queryFn: () => api.request(id),
  })

  const mutation = useMutation({
    mutationFn: (body: StatusUpdate) => api.updateRequestStatus(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request', id] })
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      setMode(null)
      setActorName('')
      setNote('')
      setResolveCode('')
    },
  })

  if (isPending) {
    return <p role="status">Cargando pedido…</p>
  }

  if (isError || !request) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <p className="font-medium">No encontramos este pedido</p>
        <Link to="/" className="mt-2 inline-block text-sm underline">
          Volver al mapa
        </Link>
      </div>
    )
  }

  const urgency = URGENCY_META[request.urgency] ?? {
    label: request.urgency,
    color: '#64748b',
  }
  const typeLabel = REQUEST_TYPE_LABELS[request.type] ?? request.type
  const canBeMarkedActive =
    request.status === 'open' || request.status === 'in_progress'
  const canReopen = request.status !== 'open'

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="text-sm text-sky-700 hover:underline">
        ← Volver al mapa
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={request.status} meta={REQUEST_STATUS_META} />
        <span className="text-sm text-slate-500">
          {typeLabel} · {request.city.name}
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
        {request.title}
      </h1>

      <p className="mt-3 whitespace-pre-line text-slate-700">
        {request.description}
      </p>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {request.transport && (
          <div>
            <dt className="font-medium text-slate-500">Transporte</dt>
            <dd className="text-slate-800">
              {TRANSPORT_LABELS[request.transport]}
            </dd>
          </div>
        )}
        {request.address && (
          <div>
            <dt className="font-medium text-slate-500">Dirección</dt>
            <dd className="text-slate-800">{request.address}</dd>
          </div>
        )}
        <div>
          <dt className="font-medium text-slate-500">Publicado</dt>
          <dd className="text-slate-800">{formatDate(request.createdAt)}</dd>
        </div>
        <ReporterContact reporter={request.reporter} nameLabel="Reporta" />
      </dl>

      {request.lat !== null && request.lng !== null && (
        <div className="mt-4">
          <Map
            center={{ lat: request.lat, lng: request.lng }}
            marker={{ lat: request.lat, lng: request.lng }}
          />
        </div>
      )}

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Acciones para coordinar la ayuda
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {request.status === 'open' &&
            '¿Estás atendiendo esta situación? Avísales a los demás para que dirijan sus esfuerzos a otra zona.'}
          {request.status === 'in_progress' &&
            'Este pedido ya tiene quién lo atiende. Si terminaron, márquenlo como resuelto.'}
          {request.status === 'resolved' &&
            'Este pedido fue resuelto. Si sigue pendiente, reábrelo.'}
          {(request.status === 'duplicate' || request.status === 'invalid') &&
            'Este pedido se descartó. Si crees que es un error, reábrelo.'}
        </p>

        {mutation.isError && (
          <div
            role="alert"
            className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {(mutation.error as Error).message}
          </div>
        )}

        {!mode && canBeMarkedActive && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setMode('attend')}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Marcarlo como siendo atendido
            </button>
            <button
              onClick={() => setMode('resolve')}
              className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              Marcarlo como resuelto
            </button>
          </div>
        )}

        {mode === 'attend' && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              mutation.mutate({
                status: 'in_progress',
                actorName: actorName.trim() || undefined,
                note: note.trim() || undefined,
              })
            }}
            className="mt-3 space-y-3"
          >
            <div>
              <label htmlFor="actorName" className="text-sm font-medium text-slate-700">
                ¿Quién está atendiendo? (opcional)
              </label>
              <input
                id="actorName"
                placeholder="Ej: Cruz Roja, grupo de voluntarios…"
                value={actorName}
                onChange={(e) => setActorName(e.target.value)}
                className={`mt-1 ${inputClass}`}
              />
            </div>
            <div>
              <label htmlFor="note" className="text-sm font-medium text-slate-700">
                Nota (opcional)
              </label>
              <input
                id="note"
                placeholder="Ej: ya van con los suministros"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={`mt-1 ${inputClass}`}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setMode(null)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {mode === 'resolve' && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              mutation.mutate({
                status: 'resolved',
                resolveCode: resolveCode.trim(),
                note: note.trim() || undefined,
              })
            }}
            className="mt-3 space-y-3"
          >
            <div>
              <label htmlFor="resolveCode" className="text-sm font-medium text-slate-700">
                Código de cierre (4 dígitos)
              </label>
              <input
                id="resolveCode"
                required
                minLength={4}
                maxLength={4}
                placeholder="1234"
                value={resolveCode}
                onChange={(e) => setResolveCode(e.target.value)}
                className={`mt-1 ${inputClass}`}
              />
              <p className="mt-1 text-xs text-slate-500">
                Se entregó al publicar el pedido. Con él se confirma que la
                situación terminó y evita cierres por error.
              </p>
            </div>
            <div>
              <label htmlFor="note" className="text-sm font-medium text-slate-700">
                Nota (opcional)
              </label>
              <input
                id="note"
                placeholder="Ej: se entregó el apoyo requerido"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={`mt-1 ${inputClass}`}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
              >
                Confirmar resolución
              </button>
              <button
                type="button"
                onClick={() => setMode(null)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {canReopen && (
          <button
            onClick={() =>
              mutation.mutate({ status: 'open', note: 'Reabierto' })
            }
            disabled={mutation.isPending}
            className="mt-3 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Reabrir pedido
          </button>
        )}
      </section>

      {request.events && request.events.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-slate-700">
            Historial del pedido
          </h2>
          <ol className="mt-2 space-y-2">
            {request.events.map((event) => (
              <li
                key={event.id}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm"
              >
                <StatusBadge status={event.status} meta={REQUEST_STATUS_META} />
                <div className="min-w-0 flex-1">
                  {event.note && <p className="text-slate-800">{event.note}</p>}
                  <p className="text-xs text-slate-500">
                    {event.actorName ?? 'Alguien'} · {formatDate(event.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}