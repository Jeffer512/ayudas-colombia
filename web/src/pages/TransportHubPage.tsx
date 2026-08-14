import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import EntityList from '../components/EntityList'
import { TRANSPORT_LABELS } from '../lib/constants'
import type { Offer } from '../lib/types'

export default function TransportHubPage() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const offersQuery = useQuery({
    queryKey: ['offers', { forTransport: true }],
    queryFn: () => api.offers({ forTransport: true }),
  })

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    retry: false,
    staleTime: 60_000,
  })

  const claimMutation = useMutation({
    mutationFn: (id: string) => api.claimOffer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      setError(null)
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo reservar la oferta. Inténtalo de nuevo.',
      )
    },
  })

  const offers: Offer[] = offersQuery.data?.offers ?? []
  const loginKnown = meQuery.isSuccess || meQuery.isError
  const loggedIn = meQuery.data?.authenticated === true
  const loading = offersQuery.isPending

  return (
    <div>
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h1 className="text-2xl font-bold tracking-tight text-amber-900">
          Centro de carga
        </h1>
        <p className="mt-1 text-sm text-amber-800">
          Suministros que alguien publicó y que necesitan transporte hasta las
          familias. Elige uno, comprométete a llevarlo y coordina con quien lo
          ofrece.
        </p>
        <Link
          to="/ofrecer-ayuda"
          className="mt-3 inline-block rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Publicar suministros que necesitan transporte
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {loading && (
        <p className="py-6 text-center text-sm text-slate-500" role="status">
          Cargando cargas disponibles…
        </p>
      )}

      {!loading && (
        <EntityList
          empty={offers.length === 0}
          emptyTitle="No hay suministros esperando transporte"
          emptyHint="Cuando alguien publique una oferta que necesita transporte, aparecerá aquí."
        >
          {offers.map((offer) => (
            <li key={offer.id}>
              <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link
                    to={`/oferta/${offer.id}`}
                    className="block"
                  >
                    <p className="font-semibold text-slate-900">{offer.title}</p>
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                      {TRANSPORT_LABELS[offer.transport ?? 'needs_transport']}
                    </span>
                    <span>{offer.city.name}</span>
                    {offer.address ? (
                      <span className="truncate">{offer.address}</span>
                    ) : null}
                  </div>
                </div>
                {offer.canClaim &&
                  loginKnown &&
                  (loggedIn ? (
                    <button
                      onClick={() => claimMutation.mutate(offer.id)}
                      disabled={claimMutation.isPending}
                      className="shrink-0 rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                    >
                      {claimMutation.isPending
                        ? 'Reservando…'
                        : 'Me comprometo a llevarla'}
                    </button>
                  ) : (
                    <Link
                      to="/iniciar-sesion"
                      className="shrink-0 rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                    >
                      Inicia sesión para llevarla
                    </Link>
                  ))}
              </div>
            </li>
          ))}
        </EntityList>
      )}
    </div>
  )
}