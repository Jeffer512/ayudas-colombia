import type { Dispatch, SetStateAction } from 'react'

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-primary'

const labelClass = 'text-sm font-medium text-fg-muted'

export interface ReporterState {
  name: string
  phone: string
  whatsapp: string
  email: string
}

interface ReporterSectionProps {
  name: string
  phone: string
  whatsapp: string
  email: string
  codeHint?: string
  requireContact?: boolean
  onPatch: Dispatch<SetStateAction<ReporterState>>
}

export default function ReporterSection({
  name,
  phone,
  whatsapp,
  email,
  codeHint = 'Es público para coordinar la ayuda. Al publicar recibirás un código de cierre de 4 dígitos.',
  requireContact = true,
  onPatch,
}: ReporterSectionProps) {
  return (
    <fieldset className="rounded-lg border border-border bg-surface p-4">
      <legend className="px-1 text-sm font-semibold text-fg-muted">
        ¿Quién reporta?
      </legend>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>
            Tu nombre
          </label>
          <input
            id="name"
            required
            placeholder="Tu nombre (visible para coordinar la ayuda)"
            value={name}
            onChange={(e) => onPatch((prev) => ({ ...prev, name: e.target.value }))}
            className={`mt-1 ${inputClass}`}
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>
            Teléfono
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            maxLength={30}
            placeholder="Ej: 310 555 1234"
            value={phone}
            onChange={(e) => onPatch((prev) => ({ ...prev, phone: e.target.value }))}
            className={`mt-1 ${inputClass}`}
          />
        </div>

        <div>
          <label htmlFor="whatsapp" className={labelClass}>
            WhatsApp (número o usuario)
          </label>
          <input
            id="whatsapp"
            placeholder="Ej: 3105550000 o @tu.usuario"
            value={whatsapp}
            onChange={(e) =>
              onPatch((prev) => ({ ...prev, whatsapp: e.target.value }))
            }
            className={`mt-1 ${inputClass}`}
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Correo
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

      <p className="mt-3 text-xs text-fg-muted">
        {requireContact
          ? 'Deja al menos un medio de contacto: teléfono, WhatsApp o correo. '
          : ''}
        {codeHint}
      </p>
    </fieldset>
  )
}
