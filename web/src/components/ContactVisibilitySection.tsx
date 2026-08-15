import {
  CONTACT_VISIBILITY_HINT,
  CONTACT_VISIBILITY_LABELS,
} from '../lib/constants'
import type { ContactVisibility } from '../lib/types'

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none'

const labelClass = 'text-sm font-medium text-slate-700'

interface ContactVisibilitySectionProps {
  value: ContactVisibility
  onChange: (value: ContactVisibility) => void
  hint?: string
}

export default function ContactVisibilitySection({
  value,
  onChange,
  hint,
}: ContactVisibilitySectionProps) {
  return (
    <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-700">
        ¿Quién puede ver tu contacto?
      </legend>

      <label htmlFor="contactVisibility" className={labelClass}>
        Contacto
      </label>
      <select
        id="contactVisibility"
        value={value}
        onChange={(e) => onChange(e.target.value as ContactVisibility)}
        className={`mt-1 ${inputClass}`}
      >
        {Object.entries(CONTACT_VISIBILITY_LABELS).map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-slate-500">
        {hint ?? CONTACT_VISIBILITY_HINT[value]}
      </p>
    </fieldset>
  )
}