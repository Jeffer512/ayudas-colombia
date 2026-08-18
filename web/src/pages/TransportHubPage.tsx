import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import EntityList from '../components/EntityList'
import Button, { buttonVariants } from '../components/ui/Button'
import { formatDate } from '../lib/format'
import {
  FAR_AWAY_DESTINATION_LABEL,
  TRANSPORT_LABELS,
  OFFER_TYPE_LABELS,
} from '../lib/constants'
import type { Offer } from '../lib/types'

function DestinationChip({ offer }: { offer: Offer }) {
  const dest = offer.destination
  if (dest.type === 'request') {
    return (
      <Link
        to={`/pedido/${dest.request.id}`}
        className="inline-block max-w-full truncate rounded-full bg-primary-muted px-2 py-0.5 text-primary hover:underline"
        title={dest.request.title}
      >
        Para el pedido: {dest.request.title}
      </Link>
    )
  }
  if (dest.type === 'acopio' || dest.type === 'org') {
    return (
      <span className="inline-block rounded-full bg-primary-muted px-2 py-0.5 text-primary">
        Destino: {dest.org.name}
      </span>
    )
  }
  return (
    <span className="inline-block rounded-full bg-surface-2 px-2 py-0.5 text-fg-muted">
      {FAR_AWAY_DESTINATION_LABEL}
    </span>
  )
}

export default function TransportHubPage() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [claimPrompt, setClaimPrompt] = useState<{
    id: string
    phone: string
    whatsapp: string
  } | null>(null)

  const availableQuery = useQuery({
    queryKey: ['offers', { forTransport: true }],
    queryFn: () => api.offers({ forTransport: true }),
  })

  const assignedQuery = useQuery({
    queryKey: ['offers', { forTransport: 'assigned' }],
    queryFn: () => api.offers({ forTransport: 'assigned' }),
  })

  const transportOffersQuery = useQuery({
    queryKey: ['offers', { type: 'transport_offered', status: 'active' }],
    queryFn: () => api.offers({ type: 'transport_offered', status: 'active' }),
  })

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    retry: false,
    staleTime: 60_000,
  })

  const claimMutation = useMutation({
    mutationFn: (payload: { id: string; phone?: string; whatsapp?: string }) =>
      api.claimOffer(payload.id, {
        ...(payload.phone ? { phone: payload.phone } : {}),
        ...(payload.whatsapp ? { whatsapp: payload.whatsapp } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      setError(null)
      setClaimPrompt(null)
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo reservar la oferta. Inténtalo de nuevo.',
      )
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelClaim(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      setError(null)
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cancelar el compromiso. Inténtalo de nuevo.',
      )
    },
  })

  const available: Offer[] = availableQuery.data?.offers ?? []
  const assigned: Offer[] = assignedQuery.data?.offers ?? []
  const transportOffers: Offer[] = transportOffersQuery.data?.offers ?? []
  const loginKnown = meQuery.isSuccess || meQuery.isError
  const loggedIn = meQuery.data?.authenticated === true
  const loading =
    availableQuery.isPending ||
    assignedQuery.isPending ||
    transportOffersQuery.isPending

  return (
    <div>
      <div className="mb-4 rounded-lg border border-warning-muted bg-warning-muted p-4">
        <h1 className="font-display text-2xl font-bold tracking-tight text-warning">
          Centro de carga
        </h1>
        <p className="mt-1 text-sm text-warning">
          Suministros que alguien publicó y que necesitan transporte hasta las
          familias. Comprométete a llevarlos o publica tu disponibilidad de
          transporte para coordinar envíos.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link to="/ofrecer-ayuda" className={buttonVariants({ variant: 'primary' })}>
            Publicar suministros que necesitan transporte
          </Link>
          <Link
            to="/ofrecer-ayuda?tipo=transport_offered"
            className={buttonVariants({ variant: 'outline' })}
          >
            Publicar transporte disponible
          </Link>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-danger-muted bg-danger-muted p-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {loading && (
        <p className="py-6 text-center text-sm text-fg-muted" role="status">
          Cargando cargas disponibles…
        </p>
      )}

      {!loading && (
        <section aria-labelledby="pendientes">
          <h2
            id="pendientes"
            className="mb-2 text-lg font-semibold text-fg"
          >
            Pendientes
          </h2>
          <EntityList
            empty={available.length === 0}
            emptyTitle="No hay suministros esperando transporte"
            emptyHint="Cuando alguien publique una oferta que necesita transporte, aparecerá aquí."
          >
            {available.map((offer) => (
              <li key={offer.id}>
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Link
                      to={`/oferta/${offer.id}`}
                      className="block"
                    >
                      <p className="font-semibold text-fg">{offer.title}</p>
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                      <span className="inline-block rounded-full bg-warning-muted px-2 py-0.5 text-warning">
                        {TRANSPORT_LABELS[offer.transport ?? 'needs_transport']}
                      </span>
                      <DestinationChip offer={offer} />
                      <span>{offer.city.name}</span>
                      {offer.address ? (
                        <span className="truncate">{offer.address}</span>
                      ) : null}
                    </div>
                    {offer.items.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {offer.items.slice(0, 5).map((item) => (
                          <span
                            key={item}
                            className="inline-block rounded-full bg-accent-muted px-2 py-0.5 text-xs text-accent-hover"
                          >
                            {item}
                          </span>
                        ))}
                        {offer.zone && (
                          <span className="text-xs text-fg-muted">
                            Zona: {offer.zone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {offer.canClaim &&
                    loginKnown &&
                    (loggedIn ? (
                      claimPrompt?.id === offer.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault()
                            claimMutation.mutate({
                              id: offer.id,
                              phone: claimPrompt.phone.trim() || undefined,
                              whatsapp: claimPrompt.whatsapp.trim() || undefined,
                            })
                          }}
                          className="flex w-full flex-col gap-2 sm:w-auto sm:items-end"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <div>
                              <label
                                htmlFor={`claimPhone-${offer.id}`}
                                className="text-xs font-medium text-fg-muted"
                              >
                                Teléfono (opcional)
                              </label>
                              <input
                                id={`claimPhone-${offer.id}`}
                                inputMode="tel"
                                placeholder="Ej: 311 555 0000"
                                value={claimPrompt.phone}
                                onChange={(e) =>
                                  setClaimPrompt({
                                    ...claimPrompt,
                                    phone: e.target.value,
                                  })
                                }
                                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-primary sm:w-44"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`claimWhatsapp-${offer.id}`}
                                className="text-xs font-medium text-fg-muted"
                              >
                                WhatsApp (opcional)
                              </label>
                              <input
                                id={`claimWhatsapp-${offer.id}`}
                                placeholder="Ej: 311 555 0000"
                                value={claimPrompt.whatsapp}
                                onChange={(e) =>
                                  setClaimPrompt({
                                    ...claimPrompt,
                                    whatsapp: e.target.value,
                                  })
                                }
                                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-primary sm:w-44"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="submit"
                              disabled={claimMutation.isPending}
                            >
                              {claimMutation.isPending
                                ? 'Reservando…'
                                : 'Confirmar compromiso'}
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setClaimPrompt(null)}
                              variant="outline"
                              className="border-warning-muted text-warning hover:bg-warning-muted"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <Button
                          onClick={() =>
                            setClaimPrompt({
                              id: offer.id,
                              phone: '',
                              whatsapp: '',
                            })
                          }
                          className="shrink-0"
                        >
                          Me comprometo a llevarla
                        </Button>
                      )
                    ) : (
                      <Link
                        to="/iniciar-sesion"
                        className={buttonVariants({
                          variant: 'outline',
                          className: 'shrink-0 border-warning-muted text-warning hover:bg-warning-muted',
                        })}
                      >
                        Inicia sesión para llevarla
                      </Link>
                    ))}
                </div>
              </li>
            ))}
          </EntityList>
        </section>
      )}

      {!loading && (
        <section aria-labelledby="comprometidas" className="mt-8">
          <h2
            id="comprometidas"
            className="mb-2 text-lg font-semibold text-fg"
          >
            Comprometidas
          </h2>
          {assigned.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-fg-muted">
              Aún no hay cargas con alguien comprometido a llevarlas.
            </p>
          ) : (
            <ul className="space-y-2">
              {assigned.map((offer) => (
                <li key={offer.id}>
                  <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <Link
                        to={`/oferta/${offer.id}`}
                        className="block"
                      >
                        <p className="font-semibold text-fg">{offer.title}</p>
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                        <span className="inline-block rounded-full bg-warning-muted px-2 py-0.5 text-warning">
                          En camino
                        </span>
                        <DestinationChip offer={offer} />
                        <span>{offer.city.name}</span>
                        {offer.claim?.claimerName ? (
                          <span>
                            {offer.claim.claimerName} se comprometió el{' '}
                            {formatDate(offer.claim.claimedAt)}
                          </span>
                        ) : null}
                      </div>
                      {offer.items.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {offer.items.slice(0, 5).map((item) => (
<span
                            key={item}
                            className="inline-block rounded-full bg-accent-muted px-2 py-0.5 text-xs text-accent-hover"
                          >
                            {item}
                          </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {offer.claim?.mine && loggedIn && (
                      <Button
                        onClick={() => cancelMutation.mutate(offer.id)}
                        disabled={cancelMutation.isPending}
                        variant="outline"
                        className="shrink-0 border-warning-muted text-warning hover:bg-warning-muted"
                      >
                        {cancelMutation.isPending
                          ? 'Cancelando…'
                          : 'Cancelar compromiso'}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!loading && (
        <section aria-labelledby="transporte-disponible" className="mt-8">
          <h2
            id="transporte-disponible"
            className="mb-2 text-lg font-semibold text-fg"
          >
            Transporte disponible
          </h2>
          <p className="mb-2 text-sm text-fg-muted">
            Personas u organizaciones que ofrecen transporte para suministros.
            Contáctalas directamente desde su oferta.
          </p>
          <EntityList
            empty={transportOffers.length === 0}
            emptyTitle="Aún no hay ofertas de transporte"
            emptyHint="Si puedes transportar suministros, publica aquí tu disponibilidad."
          >
            {transportOffers.map((offer) => (
              <li key={offer.id}>
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Link to={`/oferta/${offer.id}`} className="block">
                      <p className="font-semibold text-fg">{offer.title}</p>
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                      <span className="inline-block rounded-full bg-accent-muted px-2 py-0.5 text-accent-hover">
                        {OFFER_TYPE_LABELS.transport_offered}
                      </span>
                      <span>{offer.city.name}</span>
                      {offer.address ? (
                        <span className="truncate">{offer.address}</span>
                      ) : null}
                    </div>
                    {offer.vehicle && (
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
<span className="inline-block rounded-full bg-primary-muted px-2 py-0.5 text-primary">
                          {offer.vehicle.vehicleType ?? 'Vehículo'}
                        </span>
                        {offer.vehicle.capacity && (
                          <span>Capacidad: {offer.vehicle.capacity}</span>
                        )}
                        {offer.zone && <span>Zona: {offer.zone}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </EntityList>
        </section>
      )}
    </div>
  )
}