import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import ReportFilters from '../components/ReportFilters'
import ReportList from '../components/ReportList'
import type { City, Report, ReportFilters as ReportFiltersType } from '../lib/types'

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

  const cities: City[] = citiesQuery.data?.cities ?? []
  const reports: Report[] = data?.reports ?? []

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Reportes de ayuda</h1>
        <p className="text-sm text-slate-600">
          {data ? `${data.total} reporte(s)` : 'Cargando...'}
        </p>
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