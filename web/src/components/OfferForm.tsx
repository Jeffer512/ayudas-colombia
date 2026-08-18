import { useEffect, useState } from 'react'
import type { FormEvent, SetStateAction } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import AudienceSection from './AudienceSection'
import ContactVisibilitySection from './ContactVisibilitySection'
import LocationSection from './LocationSection'
import ReporterSection from './ReporterSection'
import TagPicker from './TagPicker'
import {
  OFFER_TYPE_LABELS,
  SUPPLIES_ITEM_OPTIONS,
  TRANSPORT_LABELS,
  TRANSPORT_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
  VOLUNTEER_CAPABILITY_OPTIONS,
} from '../lib/constants'
import { defaultCity } from '../lib/geo'
import Button from './ui/Button'
import { isValidPhone } from '../lib/phone'
import type {
  ContactVisibility,
  NewOffer,
  Offer,
  OfferAudience,
  OfferType,
  TransportOption,
  UpdateOffer,
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

interface OfferFormProps {
  mode: 'create' | 'edit'
  initial?: Offer
  submitLabel: string
  submittingLabel?: string
  onSubmit: (body: NewOffer | UpdateOffer) => Promise<void>
  onCancel: () => void
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

export default function OfferForm({
  mode,
  initial,
  submitLabel,
  submittingLabel = 'Guardando…',
  onSubmit,
  onCancel,
}: OfferFormProps) {
  const editing = mode === 'edit'
  const [searchParams] = useSearchParams()
  const transportEntry =
    !editing && searchParams.get('tipo') === 'transport_offered'
  const [type, setType] = useState<OfferType | ''>(
    editing ? initial!.type : transportEntry ? 'transport_offered' : '',
  )
  const [transport, setTransport] = useState<TransportOption | ''>(
    editing ? (initial!.transport ?? '') : '',
  )
  const [items, setItems] = useState<string[]>(editing ? initial!.items : [])
  const [zone, setZone] = useState(editing ? (initial!.zone ?? '') : '')
  const [capabilities, setCapabilities] = useState<string[]>(
    editing ? (initial!.volunteer?.capabilities ?? []) : [],
  )
  const [availability, setAvailability] = useState(
    editing ? (initial!.volunteer?.availability ?? '') : '',
  )
  const [vehicleType, setVehicleType] = useState(
    editing ? (initial!.vehicle?.vehicleType ?? '') : '',
  )
  const [capacity, setCapacity] = useState(
    editing ? (initial!.vehicle?.capacity ?? '') : '',
  )
  const [title, setTitle] = useState(editing ? initial!.title : '')
  const [description, setDescription] = useState(
    editing ? (initial!.description ?? '') : '',
  )
  const [location, setLocation] = useState<LocationState>(() =>
    editing
      ? {
          cityCode: initial!.city.code,
          address: initial!.address ?? '',
          lat: initial!.lat,
          lng: initial!.lng,
        }
      : initialLocation,
  )
  const [reporter, setReporter] = useState<ReporterState>(() =>
    editing
      ? {
          name: initial!.reporter.name ?? '',
          phone: initial!.reporter.phone ?? '',
          whatsapp: initial!.reporter.whatsapp ?? '',
          email: initial!.reporter.email ?? '',
        }
      : initialReporter,
  )
  const [contactVisibility, setContactVisibility] =
    useState<ContactVisibility>(editing ? (initial!.contactVisibility ?? 'public') : 'public')
  const [audience, setAudience] = useState<OfferAudience>(
    editing ? (initial!.audience ?? 'users') : 'users',
  )
  const [destinationOrgId, setDestinationOrgId] = useState(() => {
    if (!editing) return ''
    const dest = initial!.destination
    return dest.type === 'acopio' || dest.type === 'org' ? dest.org.id : ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const citiesQuery = useQuery({ queryKey: ['cities'], queryFn: api.cities })
  const cities = citiesQuery.data?.cities ?? []

  const showDestination =
    type === 'supplies_offered' && transport === 'needs_transport'
  const destinationOrgsQuery = useQuery({
    queryKey: ['help-orgs', { city: location.cityCode, status: 'open' }],
    queryFn: () => api.helpOrgs({ city: location.cityCode, status: 'open' }),
    enabled: showDestination && Boolean(location.cityCode),
  })
  const destinationOrgs = destinationOrgsQuery.data?.helpOrgs ?? []
  const destinationAcopio = destinationOrgs.filter(
    (org) => org.category === 'acopio',
  )
  const destinationOther = destinationOrgs.filter(
    (org) => org.category !== 'acopio',
  )

  useEffect(() => {
    if (!editing && !location.cityCode && cities.length > 0) {
      setLocation((prev) => ({ ...prev, cityCode: defaultCity(cities)!.code }))
    }
  }, [cities, location.cityCode, editing])

  const canTransport = type === 'supplies_offered'

  const showZone =
    (type === 'supplies_offered' && transport === 'can_transport') ||
    type === 'volunteers_offered' ||
    type === 'transport_offered'
  const zoneLabel =
    type === 'volunteers_offered' ? 'Zona donde puedes ayudar' : 'Zona de entrega'

  function patchLocation(patch: SetStateAction<LocationState>) {
    const prev = location
    setLocation(patch)
    const next =
      typeof patch === 'function' ? patch(prev) : patch
    if (next.cityCode !== undefined && next.cityCode !== prev.cityCode) {
      setDestinationOrgId('')
    }
  }

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
    if (phone && !isValidPhone(phone)) {
      setError('Teléfono inválido: usa entre 7 y 15 dígitos.')
      setSubmitting(false)
      return
    }

    const reporterBody = {
      name: reporter.name.trim(),
      ...(phone ? { phone } : {}),
      ...(whatsapp ? { whatsapp } : {}),
      ...(email ? { email } : {}),
    }

    let body: NewOffer | UpdateOffer
    if (editing) {
      const base: UpdateOffer = {
        title: title.trim(),
        description: description.trim() || null,
        address: location.address.trim() || null,
        lat: location.lat,
        lng: location.lng,
        reporter: reporterBody,
        contactVisibility,
      }
      if (type === 'supplies_offered') {
        base.transport = transport || null
        base.items = items
        base.zone = zone.trim() || null
        base.destinationOrgId = showDestination
          ? destinationOrgId.trim() || null
          : null
      } else if (type === 'volunteers_offered') {
        base.volunteer = {
          capabilities,
          availability: availability.trim() || null,
        }
        base.zone = zone.trim() || null
        base.audience = audience
      } else if (type === 'transport_offered') {
        base.vehicle = {
          vehicleType: vehicleType.trim() || null,
          capacity: capacity.trim() || null,
        }
        base.zone = zone.trim() || null
      }
      body = base
    } else {
      body = {
        type: type as OfferType,
        ...(canTransport && transport ? { transport } : {}),
        ...(items.length ? { items } : {}),
        ...(showDestination && destinationOrgId
          ? { destinationOrgId }
          : {}),
        ...(zone.trim() && showZone ? { zone: zone.trim() } : {}),
        ...(type === 'volunteers_offered'
          ? {
              volunteer: {
                ...(capabilities.length ? { capabilities } : {}),
                ...(availability.trim() ? { availability: availability.trim() } : {}),
              },
            }
          : {}),
        ...(type === 'transport_offered'
          ? {
              vehicle: {
                ...(vehicleType ? { vehicleType } : {}),
                ...(capacity.trim() ? { capacity: capacity.trim() } : {}),
              },
            }
          : {}),
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        cityCode: location.cityCode,
        ...(location.address.trim() ? { address: location.address.trim() } : {}),
        ...(location.lat !== null && location.lng !== null
          ? { lat: location.lat, lng: location.lng }
          : {}),
        contactVisibility,
        ...(type === 'volunteers_offered' ? { audience } : {}),
        reporter: reporterBody,
      }
    }

    onSubmit(body)
      .then(() => {
        setSubmitting(false)
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'No se pudo guardar. Inténtalo de nuevo.',
        )
        setSubmitting(false)
      })
  }

  return (
    <>
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
            ¿Qué ofreces?
          </legend>

          <div>
            <label htmlFor="type" className={labelClass}>
              Tipo
            </label>
            {editing ? (
              <p className={`mt-1 ${inputClass}`}>
                {OFFER_TYPE_LABELS[type as OfferType] ?? type}
              </p>
            ) : (
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
            )}
            {type === 'transport_offered' && (
              <p className="mt-1 text-xs text-fg-muted">
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
                <p className="mt-1 text-xs text-fg-muted">
                  Estas ofertas aparecen en el centro de carga para que alguien
                  se comprometa a llevarlas.
                </p>
              )}
            </div>
          )}

          {showDestination && (
            <div className="mt-4">
              <label htmlFor="destinationOrgId" className={labelClass}>
                ¿Hacia dónde llevarlas?
              </label>
              <select
                id="destinationOrgId"
                value={destinationOrgId}
                onChange={(e) => setDestinationOrgId(e.target.value)}
                className={`mt-1 ${inputClass}`}
              >
                <option value="">Donde se necesite</option>
                {destinationAcopio.length > 0 && (
                  <optgroup label="Centros de acopio">
                    {destinationAcopio.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {destinationOther.length > 0 && (
                  <optgroup label="Otras organizaciones">
                    {destinationOther.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              {!destinationOrgsQuery.isPending &&
                destinationOrgs.length === 0 && (
                  <p className="mt-1 text-xs text-fg-muted">
                    No hay organizaciones abiertas en esta ciudad; se llevará
                    donde se necesite.
                  </p>
                )}
            </div>
          )}

          {type === 'supplies_offered' && (
            <div className="mt-4">
              <TagPicker
                id="items"
                label="Qué ofreces (opcional)"
                options={SUPPLIES_ITEM_OPTIONS}
                value={items}
                onChange={setItems}
                chipClassName="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
              />
            </div>
          )}

          {type === 'volunteers_offered' && (
            <>
              <div className="mt-4">
                <TagPicker
                  id="capabilities"
                  label="En qué puedes ayudar (opcional)"
                  options={VOLUNTEER_CAPABILITY_OPTIONS}
                  value={capabilities}
                  onChange={setCapabilities}
                  chipClassName="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                />
              </div>
              <div className="mt-4">
                <label htmlFor="availability" className={labelClass}>
                  Horario / disponibilidad (opcional)
                </label>
                <input
                  id="availability"
                  maxLength={200}
                  placeholder="Ej: fines de semana y tardes"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className={`mt-1 ${inputClass}`}
                />
              </div>
            </>
          )}

          {type === 'transport_offered' && (
            <>
              <div className="mt-4">
                <TagPicker
                  id="vehicleType"
                  label="Tipo de vehículo (opcional)"
                  options={VEHICLE_TYPE_OPTIONS}
                  value={vehicleType ? [vehicleType] : []}
                  onChange={(next) => setVehicleType(next[0] ?? '')}
                  single
                  chipClassName="bg-primary-muted  text-primary "
                />
              </div>
              <div className="mt-4">
                <label htmlFor="capacity" className={labelClass}>
                  Capacidad (opcional)
                </label>
                <input
                  id="capacity"
                  maxLength={60}
                  placeholder="Ej: 2 toneladas, 5 pasajeros"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className={`mt-1 ${inputClass}`}
                />
              </div>
            </>
          )}

          {showZone && (
            <div className="mt-4">
              <label htmlFor="zone" className={labelClass}>
                {zoneLabel} (opcional)
              </label>
              <input
                id="zone"
                maxLength={80}
                placeholder="Ej: Barrio San Nicolás"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className={`mt-1 ${inputClass}`}
              />
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
              Descripción (opcional)
            </label>
            <textarea
              id="description"
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
          cityLocked={editing}
          address={location.address}
          lat={location.lat}
          lng={location.lng}
          addressPlaceholder="Ej: barrio o punto de entrega"
          addressHint={
            transport === 'can_transport'
              ? 'Indica arriba la zona donde puedes entregar; no hace falta dar tu dirección exacta.'
              : undefined
          }
          onPatch={patchLocation}
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
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? submittingLabel : submitLabel}
          </Button>
        </div>
      </form>
    </>
  )
}