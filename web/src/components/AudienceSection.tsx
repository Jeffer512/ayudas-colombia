import { OFFER_AUDIENCE_HINTS, OFFER_AUDIENCE_LABELS } from '../lib/constants'
import type { OfferAudience } from '../lib/types'

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none'

const labelClass = 'text-sm font-medium text-slate-700'

interface AudienceSectionProps {
  value: OfferAudience
  onChange: (value: OfferAudience) => void
}

export default function AudienceSection({ value, onChange }: AudienceSectionProps) {
  return (
    <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-700">
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
      <p className="mt-2 text-xs text-slate-500">{OFFER_AUDIENCE_HINTS[value]}</p>
    </fieldset>
  )
}