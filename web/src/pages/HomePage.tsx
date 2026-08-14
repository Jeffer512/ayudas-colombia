import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import AvisoCard from '../components/AvisoCard'
import AvisoFiltersUi from '../components/AvisoFilters'
import EntityList from '../components/EntityList'
import HomeMap from '../components/HomeMap'
import OfferCard from '../components/OfferCard'
import OfferFiltersUi from '../components/OfferFilters'
import RequestCard from '../components/RequestCard'
import RequestFiltersUi from '../components/RequestFilters'
import type {
  AcopioCenter,
  Aviso,
  AvisoFilters,
  City,
  Offer,
  OfferFilters,
  Request,
  RequestFilters,
} from '../lib/types'

const SECTION_STYLES: Record<string, { color: string; dot: string }> = {
  needs: { color: 'text-rose-700', dot: 'bg-rose-600' },
  offers: { color: 'text-emerald-700', dot: 'bg-emerald-600' },
  avisos: { color: 'text-sky-700', dot: 'bg-sky-600' },
}

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function SectionHeader({
  title,
  count,
  accent,
}: {
  title: string
  count: number | undefined
  accent: { color: string; dot: string }
}) {
  return (
    <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm">
      <span className={`flex items-center gap-2 font-semibold ${accent.color}`}>
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${accent.dot}`} />
        {title}
      </span>
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-medium text-slate-700">
        {count === undefined ? '…' : `${count} activo(s)`}
      </span>
    </summary>
  )
}

function RequestsSection({ cities }: { cities: City[] }) {
  const [filters, setFilters] = useState<RequestFilters>({ status: 'active' })
  const debouncedSearch = useDebounce(filters.q, 300)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['requests', { ...filters, q: debouncedSearch?.trim() || undefined }],
    queryFn: () => api.requests({ ...filters, q: debouncedSearch?.trim() || undefined }),
  })

  const requests: Request[] = data?.requests ?? []

  return (
    <details className="mt-4" open>
      <SectionHeader
        title="Pedidos de ayuda"
        count={data?.total}
        accent={SECTION_STYLES.needs}
      />
      <div className="mt-2 space-y-2">
        <RequestFiltersUi value={filters} cities={cities} onChange={setFilters} />
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700">
            <p className="font-medium">No pudimos cargar los pedidos</p>
            <button
              onClick={() => refetch()}
              className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        )}
        {isPending && (
          <p className="py-6 text-center text-sm text-slate-500" role="status">
            Cargando pedidos…
          </p>
        )}
        {!isPending && !isError && (
          <EntityList
            empty={requests.length === 0}
            emptyTitle="No hay pedidos con estos filtros"
            emptyHint="Publica el primero o prueba cambiando los filtros."
          >
            {requests.map((request) => (
              <li key={request.id}>
                <RequestCard request={request} />
              </li>
            ))}
          </EntityList>
        )}
      </div>
    </details>
  )
}

function OffersSection({ cities }: { cities: City[] }) {
  const [filters, setFilters] = useState<OfferFilters>({ status: 'active' })
  const debouncedSearch = useDebounce(filters.q, 300)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['offers', { ...filters, q: debouncedSearch?.trim() || undefined }],
    queryFn: () => api.offers({ ...filters, q: debouncedSearch?.trim() || undefined }),
  })

  const offers: Offer[] = data?.offers ?? []

  return (
    <details className="mt-4" open>
      <SectionHeader
        title="Ofrecer ayuda"
        count={data?.total}
        accent={SECTION_STYLES.offers}
      />
      <div className="mt-2 space-y-2">
        <OfferFiltersUi value={filters} cities={cities} onChange={setFilters} />
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700">
            <p className="font-medium">No pudimos cargar las ofertas</p>
            <button
              onClick={() => refetch()}
              className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        )}
        {isPending && (
          <p className="py-6 text-center text-sm text-slate-500" role="status">
            Cargando ofertas…
          </p>
        )}
        {!isPending && !isError && (
          <EntityList
            empty={offers.length === 0}
            emptyTitle="No hay ofertas con estos filtros"
            emptyHint="Ofrece ayuda para que otros la encuentren aquí."
          >
            {offers.map((offer) => (
              <li key={offer.id}>
                <OfferCard offer={offer} />
              </li>
            ))}
          </EntityList>
        )}
      </div>
    </details>
  )
}

function AvisosSection({ cities }: { cities: City[] }) {
  const [filters, setFilters] = useState<AvisoFilters>({ status: 'active' })
  const debouncedSearch = useDebounce(filters.q, 300)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['avisos', { ...filters, q: debouncedSearch?.trim() || undefined }],
    queryFn: () => api.avisos({ ...filters, q: debouncedSearch?.trim() || undefined }),
  })

  const avisos: Aviso[] = data?.avisos ?? []

  return (
    <details className="mt-4" open>
      <SectionHeader
        title="Avisos"
        count={data?.total}
        accent={SECTION_STYLES.avisos}
      />
      <div className="mt-2 space-y-2">
        <AvisoFiltersUi value={filters} cities={cities} onChange={setFilters} />
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700">
            <p className="font-medium">No pudimos cargar los avisos</p>
            <button
              onClick={() => refetch()}
              className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        )}
        {isPending && (
          <p className="py-6 text-center text-sm text-slate-500" role="status">
            Cargando avisos…
          </p>
        )}
        {!isPending && !isError && (
          <EntityList
            empty={avisos.length === 0}
            emptyTitle="No hay avisos con estos filtros"
            emptyHint="Comparte información útil para la comunidad."
          >
            {avisos.map((aviso) => (
              <li key={aviso.id}>
                <AvisoCard aviso={aviso} />
              </li>
            ))}
          </EntityList>
        )}
      </div>
    </details>
  )
}

export default function HomePage() {
  const [showNeeds, setShowNeeds] = useState(true)
  const [showOffers, setShowOffers] = useState(true)
  const [showAvisos, setShowAvisos] = useState(true)
  const [showAcopios, setShowAcopios] = useState(true)

  const citiesQuery = useQuery({ queryKey: ['cities'], queryFn: api.cities })

  const needsQuery = useQuery({
    queryKey: ['requests', { status: 'active' }],
    queryFn: () => api.requests({ status: 'active' }),
  })
  const offersQuery = useQuery({
    queryKey: ['offers', { status: 'active' }],
    queryFn: () => api.offers({ status: 'active' }),
  })
  const avisosQuery = useQuery({
    queryKey: ['avisos', { status: 'active' }],
    queryFn: () => api.avisos({ status: 'active' }),
  })
  const acopiosQuery = useQuery({
    queryKey: ['acopios', { status: 'open' }],
    queryFn: () => api.acopios({ status: 'open' }),
  })

  const cities: City[] = citiesQuery.data?.cities ?? []
  const requests: Request[] = needsQuery.data?.requests ?? []
  const offers: Offer[] = offersQuery.data?.offers ?? []
  const avisos: Aviso[] = avisosQuery.data?.avisos ?? []
  const acopios: AcopioCenter[] = acopiosQuery.data?.acopios ?? []

  const mapCenter = {
    lat: cities[0]?.centerLat ?? 4.8133,
    lng: cities[0]?.centerLng ?? -75.6961,
  }

  const toggles: { key: string; label: string; dot: string; checked: boolean }[] = [
    { key: 'needs', label: 'Necesito ayuda', dot: 'bg-rose-600', checked: showNeeds },
    { key: 'offers', label: 'Ofrecer', dot: 'bg-emerald-600', checked: showOffers },
    { key: 'avisos', label: 'Avisos', dot: 'bg-sky-600', checked: showAvisos },
    { key: 'acopios', label: 'Centros', dot: 'bg-teal-600', checked: showAcopios },
  ]

  const setToggle = (key: string, checked: boolean) => {
    if (key === 'needs') setShowNeeds(checked)
    if (key === 'offers') setShowOffers(checked)
    if (key === 'avisos') setShowAvisos(checked)
    if (key === 'acopios') setShowAcopios(checked)
  }

  return (
    <div>
      <div className="mb-3">
        <h1 className="text-2xl font-bold tracking-tight">Ayuda en Pereira</h1>
        <p className="mt-1 text-sm text-slate-600">
          Mapa de la ayuda: pedidos, ofertas, avisos y centros de acopio.
        </p>
      </div>

      <HomeMap
        requests={requests}
        offers={offers}
        avisos={avisos}
        acopios={acopios}
        center={mapCenter}
        showNeeds={showNeeds}
        showOffers={showOffers}
        showAvisos={showAvisos}
        showAcopios={showAcopios}
      />

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        {toggles.map((toggle) => (
          <label key={toggle.key} className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={toggle.checked}
              onChange={(e) => setToggle(toggle.key, e.target.checked)}
              aria-label={`Mostrar ${toggle.label}`}
            />
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${toggle.dot}`}
              />
              {toggle.label}
            </span>
          </label>
        ))}
      </div>

      <RequestsSection cities={cities} />
      <OffersSection cities={cities} />
      <AvisosSection cities={cities} />
    </div>
  )
}
