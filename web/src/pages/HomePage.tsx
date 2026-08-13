import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import HomeMap from '../components/HomeMap'
import ReportFilters from '../components/ReportFilters'
import ReportList from '../components/ReportList'
import { DIRECTION_META } from '../lib/constants'
import type {
  AcopioCenter,
  City,
  Direction,
  Report,
  ReportFilters as ReportFiltersType,
} from '../lib/types'

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function HomePage() {
  const [filters, setFilters] = useState<ReportFiltersType>({ status: 'active' })
  const [showReports, setShowReports] = useState(true)
  const [showAcopios, setShowAcopios] = useState(true)
  const debouncedSearch = useDebounce(filters.q, 300)

  const effectiveFilters = {
    ...filters,
    q: (debouncedSearch ?? '').trim() || undefined,
  }

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['reports', effectiveFilters],
    queryFn: () => api.reports(effectiveFilters),
  })

  const citiesQuery = useQuery({
    queryKey: ['cities'],
    queryFn: api.cities,
  })

  const acopiosQuery = useQuery({
    queryKey: ['acopios', { status: 'open' }],
    queryFn: () => api.acopios({ status: 'open' }),
  })

  const cities: City[] = citiesQuery.data?.cities ?? []
  const reports: Report[] = data?.reports ?? []
  const acopios: AcopioCenter[] = acopiosQuery.data?.acopios ?? []
  const mapCenter = {
    lat: cities[0]?.centerLat ?? 4.8133,
    lng: cities[0]?.centerLng ?? -75.6961,
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Reportes de ayuda</h1>
        <p className="text-sm text-slate-600">
          {data ? `${data.total} reporte(s)` : 'Cargando...'}
        </p>
      </div>

      <HomeMap
        reports={reports}
        acopios={acopios}
        center={mapCenter}
        showReports={showReports}
        showAcopios={showAcopios}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={showReports}
              onChange={(e) => setShowReports(e.target.checked)}
              aria-label="Mostrar reportes"
            />
            Reportes
          </label>
          {(['need', 'offer', 'info'] as Direction[]).map((direction) => (
            <span
              key={direction}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: DIRECTION_META[direction].color }}
              />
              {DIRECTION_META[direction].label}
            </span>
          ))}
          <label className="ml-2 flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={showAcopios}
              onChange={(e) => setShowAcopios(e.target.checked)}
              aria-label="Mostrar centros de acopio"
            />
            Centros de acopio
          </label>
        </div>
      </div>

      <ReportFilters
        value={filters}
        cities={cities}
        onChange={(next) => setFilters(next)}
      />

      <div className="mt-4">
        {isPending && (
          <p className="py-8 text-center text-slate-500" role="status">
            Cargando reportes…
          </p>
        )}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
            <p className="font-medium">No pudimos cargar los reportes</p>
            <button
              onClick={() => refetch()}
              className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        )}
        {!isPending && !isError && <ReportList reports={reports} />}
      </div>
    </div>
  )
}