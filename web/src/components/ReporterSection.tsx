import type { Dispatch, SetStateAction } from 'react'
import { CONTACT_TYPE_LABELS, ORGANIZATION_TYPE_LABELS } from '../lib/constants'
import type { ContactType } from '../lib/types'

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none'

const labelClass = 'text-sm font-medium text-slate-700'

interface ReporterSectionProps {
  contactType: ContactType
  name: string
  organizationName: string
  organizationType: string
  phone: string
  email: string
  codeHint?: string
  onPatch: Dispatch<SetStateAction<{
    contactType: ContactType
    name: string
    organizationName: string
    organizationType: string
    phone: string
    email: string
  }>>
}

export default function ReporterSection({
  contactType,
  name,
  organizationName,
  organizationType,
  phone,
  email,
  codeHint = 'Es público para coordinar la ayuda. Al publicar recibirás un código de cierre de 4 dígitos.',
  onPatch,
}: ReporterSectionProps) {
  return (
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
            checked={contactType === 'individual'}
            onChange={() => onPatch((prev) => ({ ...prev, contactType: 'individual' }))}
          />
          {CONTACT_TYPE_LABELS.individual}
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name="contactType"
            value="organization"
            checked={contactType === 'organization'}
            onChange={() => onPatch((prev) => ({ ...prev, contactType: 'organization' }))}
          />
          {CONTACT_TYPE_LABELS.organization}
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>
            {contactType === 'organization'
              ? 'Nombre de la persona de contacto'
              : 'Tu nombre'}
          </label>
          <input
            id="name"
            required
            placeholder={
              contactType === 'organization'
                ? 'Nombre del responsable'
                : 'Como el que firmarías junto al teléfono'
            }
            value={name}
            onChange={(e) => onPatch((prev) => ({ ...prev, name: e.target.value }))}
            className={`mt-1 ${inputClass}`}
          />
        </div>

        {contactType === 'organization' && (
          <>
            <div>
              <label htmlFor="organizationName" className={labelClass}>
                Nombre de la organización
              </label>
              <input
                id="organizationName"
                required
                placeholder="Ej: Defensa Civil Risaralda"
                value={organizationName}
                onChange={(e) =>
                  onPatch((prev) => ({ ...prev, organizationName: e.target.value }))
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
                value={organizationType}
                onChange={(e) =>
                  onPatch((prev) => ({ ...prev, organizationType: e.target.value }))
                }
                className={`mt-1 ${inputClass}`}
              >
                <option value="">Selecciona…</option>
                {Object.entries(ORGANIZATION_TYPE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
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
            value={phone}
            onChange={(e) => onPatch((prev) => ({ ...prev, phone: e.target.value }))}
            className={`mt-1 ${inputClass}`}
          />
          <p className="mt-1 text-xs text-slate-500">{codeHint}</p>
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Correo (opcional)
          </label>
          <input
            id="email"
            type="email"
            placeholder="nombre@ejemplo.com"
            value={email}
            onChange={(e) => onPatch((prev) => ({ ...prev, email: e.target.value }))}
            className={`mt-1 ${inputClass}`}
          />
        </div>
      </div>
    </fieldset>
  )
}