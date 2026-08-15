import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import AudienceSection from '../components/AudienceSection'
import ContactVisibilitySection from '../components/ContactVisibilitySection'
import LocationSection from '../components/LocationSection'
import ReporterSection from '../components/ReporterSection'
import SuccessScreen from '../components/SuccessScreen'
import { OFFER_TYPE_LABELS, TRANSPORT_LABELS, TRANSPORT_OPTIONS } from '../lib/constants'
import type {
  ContactVisibility,
  CreatedOffer,
  NewOffer,
  OfferAudience,
  OfferType,
  TransportOption,
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

function offerTypeChoices(includeTransport: boolean) {
  return Object.entries(OFFER_TYPE_LABELS).filter(
    ([code]) => includeTransport || code !== 'transport_offered',
  )
}

export default function CreateOfferPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const transportEntry = searchParams.get('tipo') === 'transport_offered'
  const [type, setType] = useState<OfferType | ''>(
    transportEntry ? 'transport_offered' : '',
  )
  const [transport, setTransport] = useState<TransportOption | ''>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState<LocationState>(initialLocation)
  const [reporter, setReporter] = useState<ReporterState>(initialReporter)
  const [contactVisibility, setContactVisibility] =
    useState<ContactVisibility>('public')
  const [audience, setAudience] = useState<OfferAudience>('users')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedOffer | null>(null)

  const citiesQuery = useQuery({ queryKey: ['cities'], queryFn: api.cities })
  const cities = citiesQuery.data?.cities ?? []

  useEffect(() => {
    if (!location.cityCode && cities.length > 0) {
      setLocation((prev) => ({ ...prev, cityCode: cities[0].code }))
    }
  }, [cities, location.cityCode])

  const canTransport = type === 'supplies_offered'

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const phone = reporter.phone.trim()
    const whatsapp = reporter.whatsapp.trim()
    const email = reporter.email.trim()
    if (!phone && !whatsapp && !email) {
      setError(
        'Deja al menos un medio de contacto: teléfono, WhatsApp o correo.',
      )
      setSubmitting(false)
      return
    }

    const body: NewOffer = {
      type: type as OfferType,
      ...(canTransport && transport ? { transport } : {}),
      title: title.trim(),
      description: description.trim(),
      cityCode: location.cityCode,
      ...(location.address.trim() ? { address: location.address.trim() } : {}),
      ...(location.lat !== null && location.lng !== null
        ? { lat: location.lat, lng: location.lng }
        : {}),
      contactVisibility,
      ...(type === 'volunteers_offered' ? { audience } : {}),
      reporter: {
        name: reporter.name.trim(),
        ...(phone ? { phone } : {}),
        ...(whatsapp ? { whatsapp } : {}),
        ...(email ? { email } : {}),
      },
    }

    api
      .createOffer(body)
      .then((createdOffer) => {
        setCreated(createdOffer)
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
        title="Oferta publicada"
        intro="Tu oferta ya aparece en el mapa y en la lista. Cuando ya no esté disponible, ciérrala con tu código:"
        code={created.resolveCode}
        codeFootnote="Es la única manera de cerrar la oferta, para que otros no te busquen en vano."
        detailHref={`/oferta/${created.id}`}
        detailLabel="Ver oferta"
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
      <h1 className="text-2xl font-bold tracking-tight">Ofrecer ayuda</h1>
      <p className="mt-1 text-sm text-slate-600">
        Diles a los demás qué puedes ofrecer. Cuando alguien se contacte y ya
        no esté disponible, ciérralo con tu código desde la oferta.
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
            ¿Qué ofreces?
          </legend>

          <div>
            <label htmlFor="type" className={labelClass}>
              Tipo
            </label>
            <select
              id="type"
              required
              value={type}
              onChange={(e) => setType(e.target.value as OfferType)}
              className={`mt-1 ${inputClass}`}
            >
              <option value="" disabled>
                Selecciona un tipo…
              </option>
              {offerTypeChoices(transportEntry).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
            {type === 'transport_offered' && (
              <p className="mt-1 text-xs text-slate-500">
                Estas ofertas aparecen en el centro de carga para coordinar el
                envío de suministros.
              </p>
            )}
          </div>

          {canTransport && (
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
                <option value="">No aplica</option>
                {TRANSPORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {TRANSPORT_LABELS[option]}
                  </option>
                ))}
              </select>
              {transport === 'needs_transport' && (
                <p className="mt-1 text-xs text-slate-500">
                  Estas ofertas aparecen en el centro de carga para que alguien
                  se comprometa a llevarlas.
                </p>
              )}
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
              placeholder="Ej: Ofrezco 50 kits de aseo para repartir"
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
              placeholder="Detalla qué ofreces: cantidades, condiciones, disponibilidad…"
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
          addressPlaceholder="Ej: barrio o punto de entrega"
          addressHint={
            transport === 'can_transport'
              ? 'Si vas a transportar todo, no hace falta dar tu dirección exacta.'
              : undefined
          }
          onPatch={setLocation}
        />

        <ReporterSection
          name={reporter.name}
          phone={reporter.phone}
          whatsapp={reporter.whatsapp}
          email={reporter.email}
          onPatch={setReporter}
        />

        <ContactVisibilitySection
          value={contactVisibility}
          onChange={setContactVisibility}
        />

        {type === 'volunteers_offered' && (
          <AudienceSection value={audience} onChange={setAudience} />
        )}

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
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {submitting ? 'Publicando…' : 'Publicar oferta'}
          </button>
        </div>
      </form>
    </div>
  )
}