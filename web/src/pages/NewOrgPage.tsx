import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import Map from '../components/Map'
import { HELP_ORG_CATEGORY_LABELS } from '../lib/constants'
import type { HelpOrgCategory } from '../lib/types'

interface OrgForm {
  name: string
  description: string
  address: string
  cityCode: string
  category: HelpOrgCategory
  lat: number | null
  lng: number | null
  contactName: string
  contactPhone: string
  hours: string
  accepts: string
}

const initialForm: OrgForm = {
  name: '',
  description: '',
  address: '',
  cityCode: '',
  category: 'acopio',
  lat: null,
  lng: null,
  contactName: '',
  contactPhone: '',
  hours: '',
  accepts: '',
}

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none'

const labelClass = 'text-sm font-medium text-slate-700'

const CATEGORY_OPTIONS: HelpOrgCategory[] = [
  'acopio',
  'albergue',
  'psicologia',
  'voluntarios',
  'other',
]

export default function NewOrgPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<OrgForm>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const citiesQuery = useQuery({ queryKey: ['cities'], queryFn: api.cities })
  const cities = citiesQuery.data?.cities ?? []

  useEffect(() => {
    if (!form.cityCode && cities.length > 0) {
      setForm((f) => ({ ...f, cityCode: cities[0].code }))
    }
  }, [cities, form.cityCode])

  const patch = (partial: Partial<OrgForm>) =>
    setForm((f) => ({ ...f, ...partial }))

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (form.lat === null || form.lng === null) {
      setError('Marca en el mapa el punto donde opera la organización.')
      return
    }
    setSubmitting(true)
    setError(null)

    api
      .createHelpOrg({
        name: form.name.trim(),
        cityCode: form.cityCode,
        lat: form.lat,
        lng: form.lng,
        category: form.category,
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
        ...(form.contactName.trim() ? { contactName: form.contactName.trim() } : {}),
        ...(form.contactPhone.trim() ? { contactPhone: form.contactPhone.trim() } : {}),
        ...(form.hours.trim() ? { hours: form.hours.trim() } : {}),
        ...(form.accepts.trim() ? { accepts: form.accepts.trim() } : {}),
      })
      .then((org) => navigate(`/organizacion/${org.id}`))
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo crear la organización. Inténtalo de nuevo.',
        )
        setSubmitting(false)
      })
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">
        Publicar una organización de ayuda
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Centros de acopio, albergues, grupos de voluntarios o equipos de apoyo.
        Aparecerá en la <strong>Red de ayudas</strong>; las organizaciones
        oficiales las marca la coordinación de la emergencia.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-sm font-semibold text-slate-700">
            La organización
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className={labelClass}>
                Nombre
              </label>
              <input
                id="name"
                required
                minLength={2}
                maxLength={140}
                placeholder="Ej: Centro de acopio La Florida"
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                className={`mt-1 ${inputClass}`}
              />
            </div>

            <div>
              <label htmlFor="category" className={labelClass}>
                Categoría
              </label>
              <select
                id="category"
                required
                value={form.category}
                onChange={(e) =>
                  patch({ category: e.target.value as HelpOrgCategory })
                }
                className={`mt-1 ${inputClass}`}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {HELP_ORG_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="contactPhone" className={labelClass}>
              Teléfono de contacto
            </label>
            <input
              id="contactPhone"
              maxLength={30}
              placeholder="Ej: 310 555 2222"
              value={form.contactPhone}
              onChange={(e) => patch({ contactPhone: e.target.value })}
              className={`mt-1 ${inputClass}`}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="description" className={labelClass}>
              Descripción
            </label>
            <textarea
              id="description"
              maxLength={2000}
              rows={3}
              placeholder="Qué hacen, a quién ayudan, condiciones de acceso…"
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              className={`mt-1 ${inputClass}`}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="accepts" className={labelClass}>
              ¿Qué reciben o necesitan? (opcional)
            </label>
            <textarea
              id="accepts"
              maxLength={2000}
              rows={2}
              placeholder="Ej: agua, alimentos no perecederos, ropa, kits de aseo"
              value={form.accepts}
              onChange={(e) => patch({ accepts: e.target.value })}
              className={`mt-1 ${inputClass}`}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="hours" className={labelClass}>
              Horario (opcional)
            </label>
            <input
              id="hours"
              maxLength={200}
              placeholder="Ej: lunes a sábado, 8am – 6pm"
              value={form.hours}
              onChange={(e) => patch({ hours: e.target.value })}
              className={`mt-1 ${inputClass}`}
            />
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-sm font-semibold text-slate-700">
            Ubicación
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cityCode" className={labelClass}>
                Ciudad
              </label>
              <select
                id="cityCode"
                required
                value={form.cityCode}
                onChange={(e) => patch({ cityCode: e.target.value })}
                className={`mt-1 ${inputClass}`}
              >
                {cities.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="address" className={labelClass}>
                Dirección o referencia
              </label>
              <input
                id="address"
                maxLength={300}
                placeholder="Ej: Carrera 20 #40-25"
                value={form.address}
                onChange={(e) => patch({ address: e.target.value })}
                className={`mt-1 ${inputClass}`}
              />
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            Haz clic en el mapa para marcar el punto exacto donde opera
            (obligatorio).
          </p>
          <div className="mt-2">
            <Map
              center={{
                lat: cities[0]?.centerLat ?? 4.8133,
                lng: cities[0]?.centerLng ?? -75.6961,
              }}
              marker={
                form.lat !== null && form.lng !== null
                  ? { lat: form.lat, lng: form.lng }
                  : null
              }
              onPick={(lat, lng) => patch({ lat, lng })}
            />
          </div>
          {form.lat !== null && form.lng !== null ? (
            <p className="mt-1 text-xs text-slate-500">
              Punto marcado: {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
            </p>
          ) : (
            <p className="mt-1 text-xs text-rose-600">
              Aún no marcas el punto en el mapa.
            </p>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contactName" className={labelClass}>
                Persona responsable (opcional)
              </label>
              <input
                id="contactName"
                maxLength={120}
                placeholder="Quién la administra"
                value={form.contactName}
                onChange={(e) => patch({ contactName: e.target.value })}
                className={`mt-1 ${inputClass}`}
              />
            </div>
          </div>
        </fieldset>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/red-de-ayudas')}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {submitting ? 'Publicando…' : 'Publicar organización'}
          </button>
        </div>
      </form>
    </div>
  )
}