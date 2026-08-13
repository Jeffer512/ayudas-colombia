import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import AcopioCard from '../components/AcopioCard'
import type { AcopioCenter } from '../lib/types'

const selectClass =
  'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none'

export default function AcopiosPage() {
  const [city, setCity] = useState('')

  const citiesQuery = useQuery({ queryKey: ['cities'], queryFn: api.cities })
  const cities = citiesQuery.data?.cities ?? []

  const acopiosQuery = useQuery({
    queryKey: ['acopios', { city: city || undefined }],
    queryFn: () => api.acopios({ ...(city ? { city } : {}) }),
  })

  const acopios: AcopioCenter[] = acopiosQuery.data?.acopios ?? []

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Centros de acopio
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Lugares donde llevar o recoger donaciones durante la emergencia.
          </p>
        </div>
        <Link
          to="/nuevo-centro"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Publicar un centro
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          aria-label="Filtrar por ciudad"
          className={selectClass}
        >
          <option value="">Todas las ciudades</option>
          {cities.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm text-slate-600">
          {acopiosQuery.data ? (
            <>
              {acopiosQuery.data.total} centro(s)
              {acopiosQuery.data.total > 0 &&
                ` (se muestran los últimos ${Math.min(acopiosQuery.data.total, acopiosQuery.data.limit)})`}
            </>
          ) : (
            'Cargando…'
          )}
        </span>
      </div>

      <div className="mt-4">
        {acopiosQuery.isPending && (
          <p className="py-8 text-center text-slate-500" role="status">
            Cargando centros…
          </p>
        )}
        {acopiosQuery.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
            <p className="font-medium">No pudimos cargar los centros</p>
          </div>
        )}
        {!acopiosQuery.isPending && !acopiosQuery.isError && acopios.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {acopios.map((acopio) => (
              <li key={acopio.id}>
                <AcopioCard acopio={acopio} />
              </li>
            ))}
          </ul>
        )}
        {!acopiosQuery.isPending && !acopiosQuery.isError && acopios.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            <p className="font-medium">Todavía no hay centros de acopio</p>
            <Link
              to="/nuevo-centro"
              className="mt-2 inline-block text-sm font-medium text-teal-700 hover:underline"
            >
              Publicar el primero
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}