import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, RefreshCw, Truck } from 'lucide-react'
import { api } from '../api/client'
import AvisoCard from '../components/AvisoCard'
import AvisoFiltersUi from '../components/AvisoFilters'
import EntityList from '../components/EntityList'
import HomeMap from '../components/HomeMap'
import OfferCard from '../components/OfferCard'
import OfferFiltersUi from '../components/OfferFilters'
import RequestCard from '../components/RequestCard'
import RequestFiltersUi from '../components/RequestFilters'
import { buttonVariants } from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import { Select } from '../components/ui/Input'
import { defaultCity, getPosition, nearestCity } from '../lib/geo'
import type {
  HelpOrg,
  Aviso,
  AvisoFilters,
  City,
  Offer,
  OfferFilters,
  Request,
  RequestFilters,
} from '../lib/types'

const MAP_CITY_KEY = 'ayudas_map_city'
const MAX_DETECTED_DISTANCE_KM = 80

function readStoredMapCity(): string {
  try {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem(MAP_CITY_KEY) ?? ''
  } catch {
    return ''
  }
}

function storeMapCity(code: string) {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(MAP_CITY_KEY, code)
  } catch {
    /* almacenamiento no disponible */
  }
}

const SECTION_STYLES: Record<string, { color: string; dot: string }> = {
  needs: { color: 'text-danger', dot: 'bg-danger' },
  offers: { color: 'text-accent-hover', dot: 'bg-accent' },
  avisos: { color: 'text-primary', dot: 'bg-primary' },
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
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2
        className={`flex items-center gap-2 font-display text-xl font-bold ${accent.color}`}
      >
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${accent.dot}`} />
        {title}
      </h2>
      <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-sm font-medium text-fg-muted">
        {count === undefined ? '…' : `${count} activo(s)`}
      </span>
    </div>
  )
}

function EntityError({
  title,
  onRetry,
}: {
  title: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-lg border border-danger-muted bg-danger-muted p-4 text-center">
      <p className="flex items-center justify-center gap-2 font-medium text-danger">
        <AlertTriangle size={18} aria-hidden="true" />
        {title}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-on-danger transition duration-fast hover:bg-danger-hover"
      >
        <RefreshCw size={14} aria-hidden="true" />
        Reintentar
      </button>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div role="status" aria-label="Cargando resultados" className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-lg border border-border bg-surface p-4">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="mt-3 h-5 w-3/4" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-2/3" />
        </div>
      ))}
    </div>
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
    <section className="mt-8" aria-labelledby="requests-title">
      <SectionHeader
        title="Pedidos de ayuda"
        count={data?.total}
        accent={SECTION_STYLES.needs}
      />
      <div className="space-y-2">
        <RequestFiltersUi value={filters} cities={cities} onChange={setFilters} count={data?.total} />
        {isError && (
          <EntityError title="No pudimos cargar los pedidos" onRetry={() => refetch()} />
        )}
        {isPending && <ListSkeleton />}
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
    </section>
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
    <section className="mt-8" aria-labelledby="offers-title">
      <SectionHeader
        title="Ofrecer ayuda"
        count={data?.total}
        accent={SECTION_STYLES.offers}
      />
      <div className="space-y-2">
        <OfferFiltersUi value={filters} cities={cities} onChange={setFilters} count={data?.total} />
        {isError && (
          <EntityError title="No pudimos cargar las ofertas" onRetry={() => refetch()} />
        )}
        {isPending && <ListSkeleton />}
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
    </section>
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
    <section className="mt-8" aria-labelledby="avisos-title">
      <SectionHeader
        title="Avisos"
        count={data?.total}
        accent={SECTION_STYLES.avisos}
      />
      <div className="space-y-2">
        <AvisoFiltersUi value={filters} cities={cities} onChange={setFilters} count={data?.total} />
        {isError && (
          <EntityError title="No pudimos cargar los avisos" onRetry={() => refetch()} />
        )}
        {isPending && <ListSkeleton />}
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
    </section>
  )
}

export default function HomePage() {
  const [showNeeds, setShowNeeds] = useState(true)
  const [showOffers, setShowOffers] = useState(true)
  const [showAvisos, setShowAvisos] = useState(true)
  const [showOrgs, setShowOrgs] = useState(true)

  const [mapCityCode, setMapCityCodeState] = useState<string>(() => readStoredMapCity())
  const mapCityLocked = useRef(false)

  const setMapCity = (code: string) => {
    mapCityLocked.current = true
    setMapCityCodeState(code)
    storeMapCity(code)
  }

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
  const orgsQuery = useQuery({
    queryKey: ['help-orgs', { status: 'open' }],
    queryFn: () => api.helpOrgs({ status: 'open' }),
  })

  const cities: City[] = citiesQuery.data?.cities ?? []
  const requests: Request[] = needsQuery.data?.requests ?? []
  const offers: Offer[] = offersQuery.data?.offers ?? []
  const avisos: Aviso[] = avisosQuery.data?.avisos ?? []
  const orgs: HelpOrg[] = orgsQuery.data?.helpOrgs ?? []

  useEffect(() => {
    if (mapCityCode || cities.length === 0) return
    const fallback = defaultCity(cities)
    if (fallback) setMapCityCodeState(fallback.code)
  }, [cities, mapCityCode])

  useEffect(() => {
    if (mapCityCode || mapCityLocked.current || cities.length === 0) return
    mapCityLocked.current = true
    getPosition()
      .then(({ lat, lng }) => {
        const near = nearestCity({ lat, lng }, cities, MAX_DETECTED_DISTANCE_KM)
        if (near) setMapCity(near.code)
      })
      .catch(() => {})
  }, [cities, mapCityCode])

  const selectedCity = cities.find((c) => c.code === mapCityCode) ?? defaultCity(cities)
  const mapCenter = {
    lat: selectedCity?.centerLat ?? 4.8133,
    lng: selectedCity?.centerLng ?? -75.6961,
  }

  const toggles: { key: string; label: string; dot: string; checked: boolean }[] = [
    { key: 'needs', label: 'Necesito ayuda', dot: 'bg-danger', checked: showNeeds },
    { key: 'offers', label: 'Ofrecer', dot: 'bg-accent', checked: showOffers },
    { key: 'avisos', label: 'Avisos', dot: 'bg-primary', checked: showAvisos },
    { key: 'helpOrgs', label: 'Red de ayudas', dot: 'bg-[var(--marker-helpOrgs)]', checked: showOrgs },
  ]

  const setToggle = (key: string, checked: boolean) => {
    if (key === 'needs') setShowNeeds(checked)
    if (key === 'offers') setShowOffers(checked)
    if (key === 'avisos') setShowAvisos(checked)
    if (key === 'helpOrgs') setShowOrgs(checked)
  }

  return (
    <div>
      <div className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
              Ayuda en {selectedCity?.name ?? 'Pereira'}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              Mapa de la ayuda: pedidos, ofertas, avisos y organizaciones de la Red de ayudas.
            </p>
          </div>
          <Link
            to="/transporte"
            className={buttonVariants({ variant: 'primary', size: 'lg' })}
          >
            <Truck size={18} aria-hidden="true" />
            Llevar suministros (centro de carga)
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Select
            value={mapCityCode}
            onChange={(e) => setMapCity(e.target.value)}
            aria-label="Centrar el mapa en"
            className="w-auto"
          >
            <option value="" disabled>
              Elegir ciudad
            </option>
            {cities.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>

          <div className="flex flex-wrap items-center gap-2">
            {toggles.map((toggle) => (
              <label
                key={toggle.key}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-fg-muted transition duration-fast hover:bg-surface-2"
              >
                <input
                  type="checkbox"
                  checked={toggle.checked}
                  onChange={(e) => setToggle(toggle.key, e.target.checked)}
                  aria-label={`Mostrar ${toggle.label}`}
                  className="accent-primary"
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
        </div>

        <div className="mt-4">
          <HomeMap
            requests={requests}
            offers={offers}
            avisos={avisos}
            helpOrgs={orgs}
            center={mapCenter}
            showNeeds={showNeeds}
            showOffers={showOffers}
            showAvisos={showAvisos}
            showOrgs={showOrgs}
          />
        </div>
      </div>

      <RequestsSection cities={cities} />
      <OffersSection cities={cities} />
      <AvisosSection cities={cities} />
    </div>
  )
}