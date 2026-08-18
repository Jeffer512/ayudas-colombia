import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import Map from '../components/Map'
import ReportButton from '../components/ReportButton'
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
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-primary'

type ActionMode = 'resolve' | 'reopen' | 'edit' | null

export default function RequestDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<ActionMode>(null)
  const [note, setNote] = useState('')
  const [resolveCode, setResolveCode] = useState('')
  const [helpMode, setHelpMode] = useState(false)
  const [helperName, setHelperName] = useState('')
  const [helperNote, setHelperNote] = useState('')
  const [iHelped, setIHelped] = useState(false)

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
      setNote('')
      setResolveCode('')
    },
  })

  const helpMutation = useMutation({
    mutationFn: (body: { markerId?: string; name?: string; note?: string }) =>
      api.helpRequest(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request', id] })
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      setHelpMode(false)
      setHelperName('')
      setHelperNote('')
      setIHelped(true)
    },
  })

  const verifyMutation = useMutation({
    mutationFn: (code: string) => api.verifyRequestCode(id, code),
    onSuccess: (_data, code) => {
      setMode(null)
      setResolveCode('')
      navigate(`/pedido/${id}/editar`, { state: { resolveCode: code } })
    },
  })

  if (isPending) {
    return <p role="status">Cargando pedido…</p>
  }

  if (isError || !request) {
    return (
      <div className="rounded-lg border border-danger-muted  bg-danger-muted  p-6 text-center text-danger ">
        <p className="font-medium">No encontramos este pedido</p>
        <Link to="/" className="mt-2 inline-block text-sm underline">
          Volver al mapa
        </Link>
      </div>
    )
  }

  const urgency = URGENCY_META[request.urgency] ?? {
    label: request.urgency,
    color: 'var(--fg-subtle)',
  }
  const typeLabel = REQUEST_TYPE_LABELS[request.type] ?? request.type
  const canBeMarkedActive = request.status === 'open'
  const canReopen = request.status !== 'open'

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="text-sm text-primary hover:underline">
        ← Volver al mapa
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={request.status} meta={REQUEST_STATUS_META} />
        <span className="text-sm text-fg-muted">
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

      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-fg">
        {request.title}
      </h1>

      {request.photo && (
        <img
          src={request.photo}
          alt={`Foto de: ${request.title}`}
          className="mt-4 w-full max-w-md rounded-lg border border-border object-cover"
        />
      )}

      {request.description && (
        <p className="mt-3 whitespace-pre-line text-fg-muted">
          {request.description}
        </p>
      )}

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {request.transport && (
          <div>
            <dt className="font-medium text-fg-muted">Transporte</dt>
            <dd className="text-fg">
              {TRANSPORT_LABELS[request.transport]}
            </dd>
          </div>
        )}
        {request.items.length > 0 && (
          <div>
            <dt className="font-medium text-fg-muted">Qué se necesita</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {request.items.map((item) => (
                <span
                  key={item}
                  className="inline-block rounded-full bg-danger-muted  px-2 py-0.5 text-xs text-danger "
                >
                  {item}
                </span>
              ))}
            </dd>
          </div>
        )}
        {request.address && (
          <div>
            <dt className="font-medium text-fg-muted">Dirección</dt>
            <dd className="text-fg">{request.address}</dd>
          </div>
        )}
        <div>
          <dt className="font-medium text-fg-muted">Publicado</dt>
          <dd className="text-fg">{formatDate(request.createdAt)}</dd>
        </div>
        <ReporterContact
          reporter={request.reporter}
          nameLabel="Reporta"
          restricted={request.contactRestricted}
        />
      </dl>

      <div className="mt-3">
        <ReportButton kind="request" targetId={request.id} />
      </div>

      {request.lat !== null && request.lng !== null && (
        <div className="mt-4">
          <Map
            center={{ lat: request.lat, lng: request.lng }}
            marker={{ lat: request.lat, lng: request.lng }}
          />
        </div>
      )}

      <section className="mt-6 rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-fg-muted">
          Acciones para coordinar la ayuda
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          {request.status === 'open' &&
            'Si puedes apoyar esta situación, dilo para que quienes esperan ayuda sepan que ya hay gente en camino.'}
          {request.status === 'resolved' &&
            'Este pedido fue resuelto. Si sigue pendiente, reábrelo.'}
          {(request.status === 'duplicate' || request.status === 'invalid') &&
            'Este pedido se descartó. Si crees que es un error, reábrelo.'}
        </p>

        {mutation.isError && (
          <div
            role="alert"
            className="mt-3 rounded-md border border-danger-muted  bg-danger-muted  p-3 text-sm text-danger "
          >
            {(mutation.error as Error).message}
          </div>
        )}

        {!mode && canBeMarkedActive && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setMode('resolve')}
              className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              Marcarlo como resuelto
            </button>
            {request.helpers === 0 && (
              <button
                onClick={() => {
                  if (request.isOwner) {
                    navigate(`/pedido/${request.id}/editar`)
                  } else {
                    setResolveCode('')
                    setMode('edit')
                  }
                }}
                className="rounded-md border border-border bg-surface px-4 py-2 text-sm text-fg-muted hover:bg-bg"
              >
                Editar pedido
              </button>
            )}
          </div>
        )}

        {mode === 'edit' && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (resolveCode.trim()) verifyMutation.mutate(resolveCode.trim())
            }}
            className="mt-3 space-y-3"
          >
            {verifyMutation.isError && (
              <div
                role="alert"
                className="rounded-md border border-danger-muted  bg-danger-muted  p-3 text-sm text-danger "
              >
                {(verifyMutation.error as Error).message}
              </div>
            )}
            <div>
              <label htmlFor="resolveCode" className="text-sm font-medium text-fg-muted">
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
              <p className="mt-1 text-xs text-fg-muted">
                Este pedido no está asociado a tu cuenta. Con el código de cierre
                que se entregó al publicarlo podrás entrar a editarlo.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={verifyMutation.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {verifyMutation.isPending ? 'Verificando…' : 'Entrar a editar'}
              </button>
              <button
                type="button"
                onClick={() => setMode(null)}
                className="rounded-md border border-border bg-surface px-4 py-2 text-sm text-fg-muted hover:bg-bg"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {(mode === 'resolve' || mode === 'reopen') && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (mode === 'reopen') {
                mutation.mutate({
                  status: 'open',
                  ...(request.isOwner ? {} : { resolveCode: resolveCode.trim() }),
                  note: note.trim() || 'Reabierto',
                })
                return
              }
              mutation.mutate({
                status: 'resolved',
                ...(request.isOwner ? {} : { resolveCode: resolveCode.trim() }),
                note: note.trim() || undefined,
              })
            }}
            className="mt-3 space-y-3"
          >
            {!request.isOwner && (
              <div>
                <label htmlFor="resolveCode" className="text-sm font-medium text-fg-muted">
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
                <p className="mt-1 text-xs text-fg-muted">
                  Se entregó al publicar el pedido. Con él se confirma que la
                  situación terminó y evita cierres o reaperturas por error.
                </p>
              </div>
            )}
            <div>
              <label htmlFor="note" className="text-sm font-medium text-fg-muted">
                Nota (opcional)
              </label>
              <input
                id="note"
                placeholder={
                  mode === 'reopen'
                    ? 'Ej: la situación sigue pendiente'
                    : 'Ej: se entregó el apoyo requerido'
                }
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
                {mode === 'reopen' ? 'Confirmar reapertura' : 'Confirmar resolución'}
              </button>
              <button
                type="button"
                onClick={() => setMode(null)}
                className="rounded-md border border-border bg-surface px-4 py-2 text-sm text-fg-muted hover:bg-bg"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {canReopen && !mode && (
          <button
            onClick={() => setMode('reopen')}
            disabled={mutation.isPending}
            className="mt-3 rounded-md border border-border bg-surface px-4 py-2 text-sm text-fg-muted hover:bg-bg"
          >
            Reabrir pedido
          </button>
        )}
      </section>

      {canBeMarkedActive && (
        <section className="mt-6 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-4">
          <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            {request.helpers === 1
              ? '1 persona está ayudando'
              : `${request.helpers} personas están ayudando`}
          </h2>
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
            {request.isOwner
              ? 'Tú creaste este pedido. Los demás pueden registrarse aquí para ayudarte.'
              : iHelped
                ? 'Gracias por ayudar. Tu apoyo a este pedido ya quedó registrado.'
                : 'Registra que puedes ayudar para que los demás coordinen sus esfuerzos.'}
          </p>

          {!request.isOwner && helpMutation.isError && (
            <div
              role="alert"
              className="mt-3 rounded-md border border-danger-muted  bg-danger-muted  p-3 text-sm text-danger "
            >
              {(helpMutation.error as Error).message}
            </div>
          )}

          {!request.isOwner &&
            (iHelped ? (
              <p className="mt-3 inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                Ya estás ayudando en este pedido
              </p>
            ) : !helpMode ? (
              <button
                onClick={() => setHelpMode(true)}
                className="mt-3 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Voy a ayudar
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  helpMutation.mutate({
                    markerId: api.markerId(),
                    name: helperName.trim() || undefined,
                    note: helperNote.trim() || undefined,
                  })
                }}
                className="mt-3 space-y-3"
              >
                <div>
                  <label
                    htmlFor="helperName"
                    className="text-sm font-medium text-emerald-800 dark:text-emerald-300"
                  >
                    Tu nombre (opcional)
                  </label>
                  <input
                    id="helperName"
                    placeholder="Ej: Camila"
                    value={helperName}
                    onChange={(e) => setHelperName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-emerald-300 dark:border-emerald-900 bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="helperNote"
                    className="text-sm font-medium text-emerald-800 dark:text-emerald-300"
                  >
                    ¿Qué vas a aportar? (opcional)
                  </label>
                  <input
                    id="helperNote"
                    placeholder="Ej: llevo agua y una carpa"
                    value={helperNote}
                    onChange={(e) => setHelperNote(e.target.value)}
                    className="mt-1 w-full rounded-md border border-emerald-300 dark:border-emerald-900 bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-emerald-600"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={helpMutation.isPending}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => setHelpMode(false)}
                    className="rounded-md border border-emerald-300 dark:border-emerald-900 bg-surface px-4 py-2 text-sm text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/40"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ))}

          {request.helperList && request.helperList.length > 0 && (
            <ul className="mt-4 space-y-2">
              {request.helperList.map((helper, index) => (
                <li
                  key={index}
                  className="rounded-md bg-surface p-3 text-sm"
                >
                  <p className="font-medium text-emerald-900 dark:text-emerald-300">
                    {helper.name ?? 'Alguien'}
                    <span className="ml-2 font-normal text-emerald-600">
                      {formatDate(helper.createdAt)}
                    </span>
                  </p>
                  {helper.note && (
                    <p className="mt-0.5 text-emerald-800 dark:text-emerald-300">{helper.note}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {request.events && request.events.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-fg-muted">
            Historial del pedido
          </h2>
          <ol className="mt-2 space-y-2">
            {request.events.map((event) => (
              <li
                key={event.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3 text-sm"
              >
                <StatusBadge status={event.status} meta={REQUEST_STATUS_META} />
                <div className="min-w-0 flex-1">
                  {event.note && <p className="text-fg">{event.note}</p>}
                  <p className="text-xs text-fg-muted">
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