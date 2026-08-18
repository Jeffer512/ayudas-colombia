import {
  CONTACT_VISIBILITY_HINT,
  CONTACT_VISIBILITY_LABELS,
} from '../lib/constants'
import type { ContactVisibility } from '../lib/types'

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-primary'

const labelClass = 'text-sm font-medium text-fg-muted'

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
    <fieldset className="rounded-lg border border-border bg-surface p-4">
      <legend className="px-1 text-sm font-semibold text-fg-muted">
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
      <p className="mt-2 text-xs text-fg-muted">
        {hint ?? CONTACT_VISIBILITY_HINT[value]}
      </p>
    </fieldset>
  )
}