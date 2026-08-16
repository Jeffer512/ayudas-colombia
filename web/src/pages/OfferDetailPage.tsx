import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import Map from '../components/Map'
import ReportButton from '../components/ReportButton'
import ReporterContact from '../components/ReporterContact'
import StatusBadge from '../components/StatusBadge'
import {
  OFFER_STATUS_META,
  OFFER_TYPE_LABELS,
  TRANSPORT_LABELS,
} from '../lib/constants'
import { formatDate } from '../lib/format'
import type { StatusUpdate } from '../lib/types'

const inputClass =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-sky-500 focus:outline-none'

export default function OfferDetailPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'close' | null>(null)
  const [closeAs, setCloseAs] = useState<'fulfilled' | 'unavailable' | 'open'>('fulfilled')
  const [resolveCode, setResolveCode] = useState('')
  const [note, setNote] = useState('')

  const { data: offer, isPending, isError } = useQuery({
    queryKey: ['offer', id],
    queryFn: () => api.offer(id),
  })

  const mutation = useMutation({
    mutationFn: (body: StatusUpdate) => api.updateOfferStatus(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer', id] })
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      setMode(null)
      setResolveCode('')
      setNote('')
    },
    onError: () => {
      /* el mensaje se muestra abajo */
    },
  })

  const cancelClaimMutation = useMutation({
    mutationFn: () => api.cancelClaim(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer', id] })
      queryClient.invalidateQueries({ queryKey: ['offers'] })
    },
  })

  if (isPending) {
    return <p role="status">Cargando oferta…</p>
  }

  if (isError || !offer) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-6 text-center text-red-700 dark:text-red-300">
        <p className="font-medium">No encontramos esta oferta</p>
        <Link to="/" className="mt-2 inline-block text-sm underline">
          Volver al mapa
        </Link>
      </div>
    )
  }

  const typeLabel = OFFER_TYPE_LABELS[offer.type] ?? offer.type
  const canClose = offer.status === 'open'
  const canReopen = offer.status === 'unavailable'
  const inTransit = offer.status === 'in_transit'
  const canCloseWithoutCode = offer.isOwner === true || offer.claim?.mine === true

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="text-sm text-sky-700 hover:underline">
        ← Volver al mapa
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={offer.status} meta={OFFER_STATUS_META} />
        <span className="text-sm text-text-muted">
          {typeLabel} · {offer.city.name}
        </span>
      </div>

      <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-main">
        {offer.title}
      </h1>

      <p className="mt-3 whitespace-pre-line text-text-muted">
        {offer.description}
      </p>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {offer.transport && (
          <div>
            <dt className="font-medium text-text-muted">Transporte</dt>
            <dd className="text-text-main">
              {TRANSPORT_LABELS[offer.transport]}
            </dd>
          </div>
        )}
        {offer.items.length > 0 && (
          <div>
            <dt className="font-medium text-text-muted">Qué se ofrece</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {offer.items.map((item) => (
                <span
                  key={item}
                  className="inline-block rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300"
                >
                  {item}
                </span>
              ))}
            </dd>
          </div>
        )}
        {offer.zone && (
          <div>
            <dt className="font-medium text-text-muted">Zona de entrega</dt>
            <dd className="text-text-main">{offer.zone}</dd>
          </div>
        )}
        {offer.volunteer && (
          <>
            {offer.volunteer.capabilities.length > 0 && (
              <div>
                <dt className="font-medium text-text-muted">En qué ayuda</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {offer.volunteer.capabilities.map((capability) => (
                    <span
                      key={capability}
                      className="inline-block rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-xs text-indigo-700 dark:text-indigo-300"
                    >
                      {capability}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {offer.volunteer.availability && (
              <div>
                <dt className="font-medium text-text-muted">Disponibilidad</dt>
                <dd className="text-text-main">{offer.volunteer.availability}</dd>
              </div>
            )}
          </>
        )}
        {offer.vehicle && (
          <>
            {offer.vehicle.vehicleType && (
              <div>
                <dt className="font-medium text-text-muted">Vehículo</dt>
                <dd className="text-text-main">{offer.vehicle.vehicleType}</dd>
              </div>
            )}
            {offer.vehicle.capacity && (
              <div>
                <dt className="font-medium text-text-muted">Capacidad</dt>
                <dd className="text-text-main">{offer.vehicle.capacity}</dd>
              </div>
            )}
          </>
        )}
        {offer.address && (
          <div>
            <dt className="font-medium text-text-muted">Dirección</dt>
            <dd className="text-text-main">{offer.address}</dd>
          </div>
        )}
        <div>
          <dt className="font-medium text-text-muted">Publicado</dt>
          <dd className="text-text-main">{formatDate(offer.createdAt)}</dd>
        </div>
        <ReporterContact
          reporter={offer.reporter}
          nameLabel="Ofrece"
          restricted={offer.contactRestricted}
        />
      </dl>

      <div className="mt-3">
        <ReportButton kind="offer" targetId={offer.id} />
      </div>

      {inTransit && offer.claim && (
        <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4">
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-300">
            Compromiso de entrega
          </h2>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            {offer.claim.claimerName
              ? `${offer.claim.claimerName} se comprometió a llevar esta oferta el ${formatDate(offer.claim.claimedAt)}.`
              : 'Alguien se comprometió a llevar esta oferta.'}{' '}
            Coordina con esa persona y confirma la entrega cuando esté hecha.
          </p>
          {offer.claim.mine && (
            <>
              {cancelClaimMutation.isError && (
                <div
                  role="alert"
                  className="mt-3 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300"
                >
                  {(cancelClaimMutation.error as Error).message}
                </div>
              )}
              <button
                onClick={() => cancelClaimMutation.mutate()}
                disabled={cancelClaimMutation.isPending}
                className="mt-3 inline-block rounded-md border border-amber-300 dark:border-amber-900 bg-surface px-4 py-2 text-sm font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 disabled:opacity-50"
              >
                {cancelClaimMutation.isPending
                  ? 'Cancelando…'
                  : 'Cancelar compromiso'}
              </button>
            </>
          )}
        </div>
      )}

      {offer.lat !== null && offer.lng !== null && (
        <div className="mt-4">
          <Map
            center={{ lat: offer.lat, lng: offer.lng }}
            marker={{ lat: offer.lat, lng: offer.lng }}
          />
        </div>
      )}

      <section className="mt-6 rounded-lg border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold text-text-muted">
          Gestionar esta oferta
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          {offer.status === 'open' &&
            'Si la oferta ya no está disponible, ciérrala con tu código para que otros no te busquen en vano.'}
          {offer.status === 'in_transit' &&
            'La oferta está en camino. Cuando se entregue, confírmalo; si estás coordinando y el compromiso se cayó, reábrela para ofrecerla de nuevo.'}
          {offer.status === 'fulfilled' &&
            'Esta oferta ya se entregó y no se puede reabrir. Gracias por la ayuda.'}
          {offer.status === 'unavailable' &&
            'Esta oferta está marcada como no disponible. Si vuelve a estar disponible, reábrela con tu código.'}
        </p>

        {mutation.isError && (
          <div
            role="alert"
            className="mt-3 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300"
          >
            {(mutation.error as Error).message}
          </div>
        )}

        {!mode && canClose && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setCloseAs('fulfilled')
                setMode('close')
              }}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Marcarla como entregada
            </button>
            <button
              onClick={() => {
                setCloseAs('unavailable')
                setMode('close')
              }}
              className="rounded-md bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Ya no está disponible
            </button>
          </div>
        )}

        {!mode && inTransit && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setCloseAs('fulfilled')
                setMode('close')
              }}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Confirmar entrega
            </button>
            {!offer.claim?.mine && (
              <button
                onClick={() => {
                  setCloseAs('open')
                  setMode('close')
                }}
                className="rounded-md border border-line bg-surface px-4 py-2 text-sm text-text-muted hover:bg-page"
              >
                Reabrir oferta
              </button>
            )}
          </div>
        )}

        {mode === 'close' && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              mutation.mutate({
                status: closeAs,
                ...(canCloseWithoutCode
                  ? {}
                  : { resolveCode: resolveCode.trim() }),
                note: note.trim() || undefined,
              })
            }}
            className="mt-3 space-y-3"
          >
            {!canCloseWithoutCode && (
              <div>
                <label htmlFor="offerResolveCode" className="text-sm font-medium text-text-muted">
                  Código de cierre (4 dígitos)
                </label>
                <input
                  id="offerResolveCode"
                  required
                  minLength={4}
                  maxLength={4}
                  placeholder="1234"
                  value={resolveCode}
                  onChange={(e) => setResolveCode(e.target.value)}
                  className={`mt-1 ${inputClass}`}
                />
                <p className="mt-1 text-xs text-text-muted">
                  Se entregó al publicar la oferta. Solo tú puedes cerrarla o reabrirla.
                </p>
              </div>
            )}
            <div>
              <label htmlFor="note" className="text-sm font-medium text-text-muted">
                Nota (opcional)
              </label>
              <input
                id="note"
                placeholder={
                  closeAs === 'fulfilled'
                    ? 'Ej: entregado a las familias del barrio Cuba'
                    : closeAs === 'unavailable'
                      ? 'Ej: vuelvo a necesitar los suministros'
                      : 'Ej: vuelvo a tener esta ayuda disponible'
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
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {closeAs === 'fulfilled'
                  ? 'Confirmar entrega'
                  : closeAs === 'unavailable'
                    ? 'Confirmar cierre'
                    : 'Confirmar reapertura'}
              </button>
              <button
                type="button"
                onClick={() => setMode(null)}
                className="rounded-md border border-line bg-surface px-4 py-2 text-sm text-text-muted hover:bg-page"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {canReopen && (
          <button
            onClick={() => {
              setCloseAs('open')
              setMode('close')
            }}
            className="mt-3 rounded-md border border-line bg-surface px-4 py-2 text-sm text-text-muted hover:bg-page"
          >
            Reabrir oferta
          </button>
        )}
      </section>
    </div>
  )
}