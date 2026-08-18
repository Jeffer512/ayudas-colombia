import { OFFER_AUDIENCE_HINTS, OFFER_AUDIENCE_LABELS } from '../lib/constants'
import type { OfferAudience } from '../lib/types'

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-primary'

const labelClass = 'text-sm font-medium text-fg-muted'

interface AudienceSectionProps {
  value: OfferAudience
  onChange: (value: OfferAudience) => void
}

export default function AudienceSection({ value, onChange }: AudienceSectionProps) {
  return (
    <fieldset className="rounded-lg border border-border bg-surface p-4">
      <legend className="px-1 text-sm font-semibold text-fg-muted">
        ¿Quién puede ver tu oferta de voluntariado?
      </legend>

      <label htmlFor="audience" className={labelClass}>
        Audiencia
      </label>
      <select
        id="audience"
        value={value}
        onChange={(e) => onChange(e.target.value as OfferAudience)}
        className={`mt-1 ${inputClass}`}
      >
        {Object.entries(OFFER_AUDIENCE_LABELS).map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-fg-muted">{OFFER_AUDIENCE_HINTS[value]}</p>
    </fieldset>
  )
}