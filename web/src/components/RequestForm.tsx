import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import ContactVisibilitySection from './ContactVisibilitySection'
import LocationSection from './LocationSection'
import ReporterSection from './ReporterSection'
import TagPicker from './TagPicker'
import {
  REQUEST_TYPE_LABELS,
  SUPPLIES_ITEM_OPTIONS,
  TRANSPORT_LABELS,
  TRANSPORT_OPTIONS,
  URGENCY_META,
} from '../lib/constants'
import { defaultCity } from '../lib/geo'
import { compressImage } from '../lib/image'
import type {
  ContactVisibility,
  NewRequest,
  Request,
  RequestType,
  TransportOption,
  UpdateRequest,
  Urgency,
} from '../lib/types'

const MISSING_TYPES: ReadonlySet<string> = new Set(['missing_person', 'missing_pet'])

const inputClass =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-sky-500 focus:outline-none'

const labelClass = 'text-sm font-medium text-text-muted'

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

interface RequestFormProps {
  mode: 'create' | 'edit'
  initial?: Request
  submitLabel: string
  submittingLabel?: string
  onSubmit: (body: NewRequest | UpdateRequest) => Promise<void>
  onCancel: () => void
}

const initialLocation: LocationState = { cityCode: '', address: '', lat: null, lng: null }
const initialReporter: ReporterState = {
  name: '',
  phone: '',
  whatsapp: '',
  email: '',
}

export default function RequestForm({
  mode,
  initial,
  submitLabel,
  submittingLabel = 'Guardando…',
  onSubmit,
  onCancel,
}: RequestFormProps) {
  const editing = mode === 'edit'
  const initialType = editing ? (initial!.type as RequestType) : ''
  const [type, setType] = useState<RequestType | ''>(initialType)
  const [urgency, setUrgency] = useState<Urgency>(
    editing ? initial!.urgency : 'medium',
  )
  const [transport, setTransport] = useState<TransportOption | ''>(
    editing ? (initial!.transport ?? '') : '',
  )
  const [items, setItems] = useState<string[]>(editing ? initial!.items : [])
  const [title, setTitle] = useState(editing ? initial!.title : '')
  const [description, setDescription] = useState(
    editing ? (initial!.description ?? '') : '',
  )
  const [photo, setPhoto] = useState<string | null>(
    editing ? (initial!.photo ?? null) : null,
  )
  const [photoError, setPhotoError] = useState<string | null>(null)
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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const citiesQuery = useQuery({ queryKey: ['cities'], queryFn: api.cities })
  const cities = citiesQuery.data?.cities ?? []

  useEffect(() => {
    if (!editing && !location.cityCode && cities.length > 0) {
      setLocation((prev) => ({ ...prev, cityCode: defaultCity(cities)!.code }))
    }
  }, [cities, location.cityCode, editing])

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

    const reporterBody = {
      name: reporter.name.trim(),
      ...(phone ? { phone } : {}),
      ...(whatsapp ? { whatsapp } : {}),
      ...(email ? { email } : {}),
    }

    let body: NewRequest | UpdateRequest
    if (editing) {
      const base: UpdateRequest = {
        title: title.trim(),
        description: description.trim() || null,
        ...(type === 'supplies_request' ? { transport: transport || null } : {}),
        items,
        address: location.address.trim() || null,
        lat: location.lat,
        lng: location.lng,
        urgency,
        contactVisibility,
        reporter: reporterBody,
      }
      const initialPhoto = initial!.photo ?? null
      if (photo !== initialPhoto) {
        base.photo = photo ?? null
      }
      body = base
    } else {
      body = {
        type: type as RequestType,
        urgency,
        ...(type === 'supplies_request' && transport ? { transport } : {}),
        ...(type === 'supplies_request' && items.length ? { items } : {}),
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(photo ? { photo } : {}),
        cityCode: location.cityCode,
        ...(location.address.trim() ? { address: location.address.trim() } : {}),
        ...(location.lat !== null && location.lng !== null
          ? { lat: location.lat, lng: location.lng }
          : {}),
        contactVisibility,
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
          className="mt-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <fieldset className="rounded-lg border border-line bg-surface p-4">
          <legend className="px-1 text-sm font-semibold text-text-muted">
            ¿Qué necesitas?
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="type" className={labelClass}>
                Tipo
              </label>
              {editing ? (
                <p className={`mt-1 ${inputClass}`}>
                  {REQUEST_TYPE_LABELS[type as RequestType] ?? type}
                </p>
              ) : (
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
              )}
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
              <p className="mt-1 text-xs text-text-muted">
                Si marcas "Necesito transporte", quien ofrezca suministros sabrá
                que también debe poder llevarlos.
              </p>
            </div>
          )}

          {type === 'supplies_request' && (
            <div className="mt-4">
              <TagPicker
                id="items"
                label="Qué necesitas (opcional)"
                options={SUPPLIES_ITEM_OPTIONS}
                value={items}
                onChange={setItems}
                chipClassName="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
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
              placeholder="Ej: Necesitamos agua potable en el Centro"
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
              placeholder="Detalla qué necesitas: qué hace falta, cuántas personas, cómo llegar…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>

          {type !== '' && MISSING_TYPES.has(type) && (
            <div className="mt-4">
              <label htmlFor="photo" className={labelClass}>
                Foto (opcional)
              </label>
              <p className="mt-1 text-xs text-text-muted">
                Una foto ayuda a identificar a la persona o la mascota. Se
                reduce automáticamente al enviarla.
              </p>
              {photo ? (
                <div className="mt-2 flex items-start gap-3">
                  <img
                    src={photo}
                    alt="Vista previa de la foto"
                    className="h-40 w-40 rounded-md border border-line object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null)
                      setPhotoError(null)
                    }}
                    className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-text-muted hover:bg-page"
                  >
                    Quitar foto
                  </button>
                </div>
              ) : (
                <input
                  id="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="mt-2 block w-full text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-sky-700 hover:file:bg-sky-100"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setPhotoError(null)
                    try {
                      setPhoto(await compressImage(file))
                    } catch (err) {
                      setPhotoError(
                        err instanceof Error
                          ? err.message
                          : 'No se pudo procesar la foto',
                      )
                    } finally {
                      e.target.value = ''
                    }
                  }}
                />
              )}
              {photoError && (
                <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-300">
                  {photoError}
                </p>
              )}
            </div>
          )}
        </fieldset>

        <LocationSection
          cities={cities}
          cityCode={location.cityCode}
          cityLocked={editing}
          address={location.address}
          lat={location.lat}
          lng={location.lng}
          addressPlaceholder="Ej: Barrio Kennedy, sector de la iglesia"
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

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-text-muted hover:bg-page"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50 ${
              editing ? 'bg-sky-700 hover:bg-sky-800' : 'bg-rose-700'
            }`}
          >
            {submitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </>
  )
}