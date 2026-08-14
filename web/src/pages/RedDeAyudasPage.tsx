import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import HelpOrgCard from '../components/HelpOrgCard'
import { HELP_ORG_CATEGORY_LABELS } from '../lib/constants'
import type { HelpOrg, HelpOrgCategory } from '../lib/types'

const selectClass =
  'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none'

const CATEGORIES: (HelpOrgCategory | '')[] = [
  '',
  'acopio',
  'psicologia',
  'voluntarios',
  'albergue',
  'other',
]

export default function RedDeAyudasPage() {
  const [city, setCity] = useState('')
  const [category, setCategory] = useState<HelpOrgCategory | ''>('')

  const citiesQuery = useQuery({ queryKey: ['cities'], queryFn: api.cities })
  const cities = citiesQuery.data?.cities ?? []

  const orgsQuery = useQuery({
    queryKey: ['help-orgs', { city: city || undefined, category: category || undefined }],
    queryFn: () =>
      api.helpOrgs({
        ...(city ? { city } : {}),
        ...(category ? { category } : {}),
      }),
  })

  const orgs: HelpOrg[] = orgsQuery.data?.helpOrgs ?? []

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Red de ayudas</h1>
          <p className="mt-1 text-sm text-slate-600">
            Centros de acopio, albergues, grupos de voluntarios y apoyo
            psicológico que operan durante la emergencia.
          </p>
        </div>
        <Link
          to="/nuevo-centro"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Publicar una organización
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as HelpOrgCategory | '')}
          aria-label="Filtrar por categoría"
          className={selectClass}
        >
          <option value="">Todas las categorías</option>
          {CATEGORIES.filter(Boolean).map((c) => (
            <option key={c} value={c}>
              {HELP_ORG_CATEGORY_LABELS[c as HelpOrgCategory]}
            </option>
          ))}
        </select>
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
          {orgsQuery.data ? (
            <>
              {orgsQuery.data.total} organización(es)
              {orgsQuery.data.total > 0 &&
                ` (se muestran las últimas ${Math.min(orgsQuery.data.total, orgsQuery.data.limit)})`}
            </>
          ) : (
            'Cargando…'
          )}
        </span>
      </div>

      <div className="mt-4">
        {orgsQuery.isPending && (
          <p className="py-8 text-center text-slate-500" role="status">
            Cargando organizaciones…
          </p>
        )}
        {orgsQuery.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
            <p className="font-medium">No pudimos cargar la red de ayudas</p>
          </div>
        )}
        {!orgsQuery.isPending && !orgsQuery.isError && orgs.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {orgs.map((org) => (
              <li key={org.id}>
                <HelpOrgCard org={org} />
              </li>
            ))}
          </ul>
        )}
        {!orgsQuery.isPending && !orgsQuery.isError && orgs.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            <p className="font-medium">Todavía no hay organizaciones en esta red</p>
            <Link
              to="/nuevo-centro"
              className="mt-2 inline-block text-sm font-medium text-teal-700 hover:underline"
            >
              Publicar la primera
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}