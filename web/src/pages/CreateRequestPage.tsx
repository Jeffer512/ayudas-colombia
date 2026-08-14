import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import LocationSection from '../components/LocationSection'
import ReporterSection from '../components/ReporterSection'
import SuccessScreen from '../components/SuccessScreen'
import { REQUEST_TYPE_LABELS, TRANSPORT_LABELS, TRANSPORT_OPTIONS, URGENCY_META } from '../lib/constants'
import type {
  ContactType,
  CreatedRequest,
  NewRequest,
  RequestType,
  TransportOption,
  Urgency,
} from '../lib/types'

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
  contactType: ContactType
  name: string
  organizationName: string
  organizationType: string
  phone: string
  email: string
}

const initialLocation: LocationState = { cityCode: '', address: '', lat: null, lng: null }
const initialReporter: ReporterState = {
  contactType: 'individual',
  name: '',
  organizationName: '',
  organizationType: '',
  phone: '',
  email: '',
}

export default function CreateRequestPage() {
  const navigate = useNavigate()
  const [type, setType] = useState<RequestType | ''>('')
  const [urgency, setUrgency] = useState<Urgency>('medium')
  const [transport, setTransport] = useState<TransportOption | ''>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState<LocationState>(initialLocation)
  const [reporter, setReporter] = useState<ReporterState>(initialReporter)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedRequest | null>(null)

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

    const isOrganization = reporter.contactType === 'organization'
    const body: NewRequest = {
      type: type as RequestType,
      urgency,
      ...(type === 'supplies_request' && transport ? { transport } : {}),
      title: title.trim(),
      description: description.trim(),
      cityCode: location.cityCode,
      ...(location.address.trim() ? { address: location.address.trim() } : {}),
      ...(location.lat !== null && location.lng !== null
        ? { lat: location.lat, lng: location.lng }
        : {}),
      reporter: {
        contactType: reporter.contactType,
        name: reporter.name.trim(),
        ...(isOrganization
          ? {
              organizationName: reporter.organizationName.trim(),
              organizationType: reporter.organizationType || undefined,
            }
          : {}),
        phone: reporter.phone.trim(),
        ...(reporter.email.trim() ? { email: reporter.email.trim() } : {}),
      },
    }

    api
      .createRequest(body)
      .then((createdRequest) => {
        setCreated(createdRequest)
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
        title="Pedido publicado"
        intro="Tu pedido ya aparece en el mapa y en la lista. Guarda tu código para cerrarlo cuando la situación termine:"
        code={created.resolveCode}
        codeFootnote="Con él se marca tu pedido como resuelto."
        detailHref={`/pedido/${created.id}`}
        detailLabel="Ver pedido"
        onReset={() => {
          setCreated(null)
          setType('')
          setTitle('')
          setDescription('')
          setTransport('')
          setLocation(initialLocation)
          setReporter(initialReporter)
        }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Pedir ayuda</h1>
      <p className="mt-1 text-sm text-slate-600">
        Cuéntanos qué necesitas. Así, vecinos, organizaciones y centros de
        acopio lo verán en el mapa y podrán coordinar la ayuda hacia tu zona.
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
            ¿Qué necesitas?
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="type" className={labelClass}>
                Tipo
              </label>
              <select
                id="type"
                required
                value={type}
                onChange={(e) => setType(e.target.value as RequestType)}
                className={`mt-1 ${inputClass}`}
              >
                <option value="" disabled>
                  Selecciona un tipo…
                </option>
                {Object.entries(REQUEST_TYPE_LABELS).map(([code, label]) => (
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

          {type === 'supplies_request' && (
            <div className="mt-4">
              <label htmlFor="transport" className={labelClass}>
                Transporte
              </label>
              <select
                id="transport"
                value={transport}
                onChange={(e) => setTransport(e.target.value as TransportOption)}
                className={`mt-1 ${inputClass}`}
              >
                <option value="">Sin preferencia de transporte</option>
                {TRANSPORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {TRANSPORT_LABELS[option]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Si marcas "Necesito transporte", quien ofrezca suministros sabrá
                que también debe poder llevarlos.
              </p>
            </div>
          )}

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
              placeholder="Detalla qué necesitas: qué hace falta, cuántas personas, cómo llegar…"
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
          addressPlaceholder="Ej: Barrio Kennedy, sector de la iglesia"
          onPatch={setLocation}
        />

        <ReporterSection
          contactType={reporter.contactType}
          name={reporter.name}
          organizationName={reporter.organizationName}
          organizationType={reporter.organizationType}
          phone={reporter.phone}
          email={reporter.email}
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
            className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
          >
            {submitting ? 'Publicando…' : 'Publicar pedido'}
          </button>
        </div>
      </form>
    </div>
  )
}