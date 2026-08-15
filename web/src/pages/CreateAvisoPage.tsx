import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import LocationSection from '../components/LocationSection'
import ReporterSection from '../components/ReporterSection'
import SuccessScreen from '../components/SuccessScreen'
import { URGENCY_META } from '../lib/constants'
import type { CreatedAviso, NewAviso, Urgency } from '../lib/types'

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none'

const labelClass = 'text-sm font-medium text-slate-700'

interface LocationState {
  cityCode: string
  address: string
  lat: number | null
  lng: number | null
}

interface ReporterState {
  name: string
  phone: string
  whatsapp: string
  email: string
}

const initialLocation: LocationState = { cityCode: '', address: '', lat: null, lng: null }
const initialReporter: ReporterState = {
  name: '',
  phone: '',
  whatsapp: '',
  email: '',
}

export default function CreateAvisoPage() {
  const navigate = useNavigate()
  const [urgency, setUrgency] = useState<Urgency>('medium')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState<LocationState>(initialLocation)
  const [reporter, setReporter] = useState<ReporterState>(initialReporter)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedAviso | null>(null)

  const citiesQuery = useQuery({ queryKey: ['cities'], queryFn: api.cities })
  const cities = citiesQuery.data?.cities ?? []

  useEffect(() => {
    if (!location.cityCode && cities.length > 0) {
      setLocation((prev) => ({ ...prev, cityCode: cities[0].code }))
    }
  }, [cities, location.cityCode])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const body: NewAviso = {
      urgency,
      title: title.trim(),
      description: description.trim(),
      cityCode: location.cityCode,
      ...(location.address.trim() ? { address: location.address.trim() } : {}),
      ...(location.lat !== null && location.lng !== null
        ? { lat: location.lat, lng: location.lng }
        : {}),
      reporter: {
        name: reporter.name.trim(),
        ...(reporter.phone.trim() ? { phone: reporter.phone.trim() } : {}),
        ...(reporter.whatsapp.trim() ? { whatsapp: reporter.whatsapp.trim() } : {}),
        ...(reporter.email.trim() ? { email: reporter.email.trim() } : {}),
      },
    }

    api
      .createAviso(body)
      .then((createdAviso) => {
        setCreated(createdAviso)
        setSubmitting(false)
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo publicar. Inténtalo de nuevo.',
        )
        setSubmitting(false)
      })
  }

  if (created) {
    return (
      <SuccessScreen
        title="Aviso publicado"
        intro="Tu aviso ya aparece en el mapa y en la lista. Si deja de ser útil, la comunidad puede marcarlo como desactualizado."
        detailHref={`/aviso/${created.id}`}
        detailLabel="Ver aviso"
        onReset={() => {
          setCreated(null)
          setTitle('')
          setDescription('')
          setLocation(initialLocation)
          setReporter(initialReporter)
        }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Avisos</h1>
      <p className="mt-1 text-sm text-slate-600">
        Comparte información útil para la comunidad: daños, puntos de
        distribución, rutas, recomendaciones. No es un pedido ni una oferta.
      </p>
      <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Este espacio es de la comunidad. Si es una emergencia, llama a las
        autoridades:         123 emergencias · 119 bomberos · 125 defensa civil.
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
            ¿Qué quieres informar?
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="urgency" className={labelClass}>
                Urgencia
              </label>
              <select
                id="urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as Urgency)}
                className={`mt-1 ${inputClass}`}
              >
                {Object.entries(URGENCY_META).map(([code, meta]) => (
                  <option key={code} value={code}>
                    Urgencia {meta.label}
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
              placeholder="Ej: Punto de agua funcionando en el parque"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              placeholder="Comparte la información útil: qué pasó, dónde, horarios…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
        </fieldset>

        <LocationSection
          cities={cities}
          cityCode={location.cityCode}
          address={location.address}
          lat={location.lat}
          lng={location.lng}
          addressPlaceholder="Ej: Parque principal, costado oriental"
          onPatch={setLocation}
        />

        <ReporterSection
          name={reporter.name}
          phone={reporter.phone}
          whatsapp={reporter.whatsapp}
          email={reporter.email}
          codeHint="Es público para coordinar la ayuda."
          requireContact={false}
          onPatch={setReporter}
        />

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
            {submitting ? 'Publicando…' : 'Publicar aviso'}
          </button>
        </div>
      </form>
    </div>
  )
}