import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import Map from '../components/Map'
import {
  CONTACT_TYPE_LABELS,
  ORGANIZATION_TYPE_LABELS,
  REPORT_TYPE_LABELS,
  URGENCY_META,
} from '../lib/constants'
import type {
  ContactType,
  NewReport,
  ReportType,
  Urgency,
} from '../lib/types'

interface FormState {
  type: ReportType | ''
  urgency: Urgency
  title: string
  description: string
  address: string
  cityCode: string
  lat: number | null
  lng: number | null
  contactType: ContactType
  name: string
  organizationName: string
  organizationType: string
  phone: string
  email: string
}

const initialForm: FormState = {
  type: '',
  urgency: 'medium',
  title: '',
  description: '',
  address: '',
  cityCode: '',
  lat: null,
  lng: null,
  contactType: 'individual',
  name: '',
  organizationName: '',
  organizationType: '',
  phone: '',
  email: '',
}

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none'

const labelClass = 'text-sm font-medium text-slate-700'

export default function CreateReportPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const citiesQuery = useQuery({ queryKey: ['cities'], queryFn: api.cities })
  const cities = citiesQuery.data?.cities ?? []

  useEffect(() => {
    if (!form.cityCode && cities.length > 0) {
      setForm((f) => ({ ...f, cityCode: cities[0].code }))
    }
  }, [cities, form.cityCode])

  const patch = (partial: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...partial }))

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const isOrganization = form.contactType === 'organization'
    const body: NewReport = {
      type: form.type as ReportType,
      urgency: form.urgency,
      title: form.title.trim(),
      description: form.description.trim(),
      cityCode: form.cityCode,
      ...(form.address.trim() ? { address: form.address.trim() } : {}),
      ...(form.lat !== null && form.lng !== null
        ? { lat: form.lat, lng: form.lng }
        : {}),
      reporter: {
        contactType: form.contactType,
        name: form.name.trim(),
        ...(isOrganization
          ? {
              organizationName: form.organizationName.trim(),
              organizationType: form.organizationType || undefined,
            }
          : {}),
        phone: form.phone.trim(),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
      },
    }

    api
      .createReport(body)
      .then((created) => navigate(`/reporte/${created.id}`))
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo crear el reporte. Inténtalo de nuevo.',
        )
        setSubmitting(false)
      })
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">
        Reportar una necesidad u ofrecer ayuda
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Cuéntanos qué ocurre y hacia dónde dirigir la ayuda. Si ya alguien está
        atendiendo el caso, se verá reflejado y podrás ayudar en otra zona.
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
            ¿Qué necesitas o qué ofreces?
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="type" className={labelClass}>
                Tipo de reporte
              </label>
              <select
                id="type"
                required
                value={form.type}
                onChange={(e) =>
                  patch({ type: e.target.value as ReportType })
                }
                className={`mt-1 ${inputClass}`}
              >
                <option value="" disabled>
                  Selecciona un tipo…
                </option>
                {Object.entries(REPORT_TYPE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="urgency" className={labelClass}>
                Urgencia
              </label>
              <select
                id="urgency"
                value={form.urgency}
                onChange={(e) =>
                  patch({ urgency: e.target.value as Urgency })
                }
                className={`mt-1 ${inputClass}`}
              >
                {Object.entries(URGENCY_META).map(([code, { label }]) => (
                  <option key={code} value={code}>
                    Urgencia {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="title" className={labelClass}>
              Título
            </label>
            <input
              id="title"
              required
              minLength={5}
              maxLength={140}
              placeholder="Ej: Necesitamos agua potable en el Centro"
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              className={`mt-1 ${inputClass}`}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="description" className={labelClass}>
              Descripción
            </label>
            <textarea
              id="description"
              required
              minLength={10}
              maxLength={4000}
              rows={4}
              placeholder="Detalla la situación: qué hace falta, cuántas personas, cómo llegar…"
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
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
                placeholder="Ej: Calle 12 #4-50, junto a la iglesia"
                value={form.address}
                onChange={(e) => patch({ address: e.target.value })}
                className={`mt-1 ${inputClass}`}
              />
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            Haz clic en el mapa para marcar el punto exacto (opcional).
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
          {form.lat !== null && form.lng !== null && (
            <p className="mt-1 text-xs text-slate-500">
              Punto marcado: {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
            </p>
          )}
        </fieldset>

        <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-sm font-semibold text-slate-700">
            ¿Quién reporta?
          </legend>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="contactType"
                value="individual"
                checked={form.contactType === 'individual'}
                onChange={() => patch({ contactType: 'individual' })}
              />
              {CONTACT_TYPE_LABELS.individual}
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="contactType"
                value="organization"
                checked={form.contactType === 'organization'}
                onChange={() => patch({ contactType: 'organization' })}
              />
              {CONTACT_TYPE_LABELS.organization}
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className={labelClass}>
                {form.contactType === 'organization'
                  ? 'Nombre de la persona de contacto'
                  : 'Tu nombre'}
              </label>
              <input
                id="name"
                required
                placeholder={
                  form.contactType === 'organization'
                    ? 'Nombre del responsable'
                    : 'Como el que firmarías junto al teléfono'
                }
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                className={`mt-1 ${inputClass}`}
              />
            </div>

            {form.contactType === 'organization' && (
              <>
                <div>
                  <label htmlFor="organizationName" className={labelClass}>
                    Nombre de la organización
                  </label>
                  <input
                    id="organizationName"
                    required
                    placeholder="Ej: Defensa Civil Risaralda"
                    value={form.organizationName}
                    onChange={(e) =>
                      patch({ organizationName: e.target.value })
                    }
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
                <div>
                  <label htmlFor="organizationType" className={labelClass}>
                    Tipo de organización
                  </label>
                  <select
                    id="organizationType"
                    value={form.organizationType}
                    onChange={(e) =>
                      patch({ organizationType: e.target.value })
                    }
                    className={`mt-1 ${inputClass}`}
                  >
                    <option value="">Selecciona…</option>
                    {Object.entries(ORGANIZATION_TYPE_LABELS).map(
                      ([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </>
            )}

            <div>
              <label htmlFor="phone" className={labelClass}>
                Teléfono de contacto
              </label>
              <input
                id="phone"
                required
                minLength={3}
                placeholder="Ej: 310 555 1234"
                value={form.phone}
                onChange={(e) => patch({ phone: e.target.value })}
                className={`mt-1 ${inputClass}`}
              />
              <p className="mt-1 text-xs text-slate-500">
                Es público para coordinar la ayuda. Con los últimos 4 dígitos se
                podrá marcar el reporte como resuelto.
              </p>
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                Correo (opcional)
              </label>
              <input
                id="email"
                type="email"
                placeholder="nombre@ejemplo.com"
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
                className={`mt-1 ${inputClass}`}
              />
            </div>
          </div>
        </fieldset>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
          >
            {submitting ? 'Publicando…' : 'Publicar reporte'}
          </button>
        </div>
      </form>
    </div>
  )
}