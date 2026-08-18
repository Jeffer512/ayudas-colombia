import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import ContactVisibilitySection from '../components/ContactVisibilitySection'
import LocationSection from '../components/LocationSection'
import ReporterSection from '../components/ReporterSection'
import SuccessScreen from '../components/SuccessScreen'
import { URGENCY_META } from '../lib/constants'
import { defaultCity } from '../lib/geo'
import { isValidPhone } from '../lib/phone'
import Button from '../components/ui/Button'
import type {
  ContactVisibility,
  CreatedAviso,
  NewAviso,
  Urgency,
} from '../lib/types'

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-primary'

const labelClass = 'text-sm font-medium text-fg-muted'

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
  const [contactVisibility, setContactVisibility] =
    useState<ContactVisibility>('public')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedAviso | null>(null)

  const citiesQuery = useQuery({ queryKey: ['cities'], queryFn: api.cities })
  const cities = citiesQuery.data?.cities ?? []

  useEffect(() => {
    if (!location.cityCode && cities.length > 0) {
      setLocation((prev) => ({ ...prev, cityCode: defaultCity(cities)!.code }))
    }
  }, [cities, location.cityCode])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const phone = reporter.phone.trim()
    if (phone && !isValidPhone(phone)) {
      setError('Teléfono inválido: usa entre 7 y 15 dígitos.')
      setSubmitting(false)
      return
    }

    const body: NewAviso = {
      urgency,
      title: title.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      cityCode: location.cityCode,
      ...(location.address.trim() ? { address: location.address.trim() } : {}),
      ...(location.lat !== null && location.lng !== null
        ? { lat: location.lat, lng: location.lng }
        : {}),
      contactVisibility,
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
      <p className="mt-1 text-sm text-fg-muted">
        Comparte información útil para la comunidad: daños, puntos de
        distribución, rutas, recomendaciones. No es un pedido ni una oferta.
      </p>
      <p className="mt-2 rounded-lg border border-warning-muted  bg-warning-muted  p-3 text-sm text-warning ">
        Este espacio es de la comunidad. Si es una emergencia, llama a las
        autoridades:         123 Emergencias · 119 Bomberos · 125 Ambulancias / Emergencias Médicas.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-danger-muted  bg-danger-muted  p-3 text-sm text-danger "
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <fieldset className="rounded-lg border border-border bg-surface p-4">
          <legend className="px-1 text-sm font-semibold text-fg-muted">
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
              Descripción (opcional)
            </label>
            <textarea
              id="description"
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

        <ContactVisibilitySection
          value={contactVisibility}
          onChange={setContactVisibility}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Publicando…' : 'Publicar aviso'}
          </Button>
        </div>
      </form>
    </div>
  )
}