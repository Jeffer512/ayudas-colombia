import { useState } from 'react'

const CUSTOM = '__otro__'

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-primary'

const labelClass = 'text-sm font-medium text-fg-muted'

type Editing = 'append' | { index: number }

interface TagPickerProps {
  id: string
  label: string
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  otroLabel?: string
  max?: number
  single?: boolean
  chipClassName?: string
}

export default function TagPicker({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'Selecciona una opción…',
  otroLabel = 'Otro…',
  max = 10,
  single = false,
  chipClassName = 'bg-surface-2 text-fg',
}: TagPickerProps) {
  const [editing, setEditing] = useState<Editing>('append')
  const [composing, setComposing] = useState(false)
  const [custom, setCustom] = useState('')

  const targetIndex =
    editing === 'append' ? -1 : editing.index < value.length ? editing.index : -1
  const atMax = !single && value.length >= max
  const duplicate = custom.trim() !== '' && value.includes(custom.trim())
  const edited = targetIndex === -1 ? '' : value[targetIndex]
  const selectValue = composing
    ? CUSTOM
    : options.includes(edited)
      ? edited
      : ''

  function commit(entry: string) {
    if (targetIndex === -1) {
      if (atMax) return
      onChange([...value, entry])
    } else {
      onChange(value.map((item, i) => (i === targetIndex ? entry : item)))
    }
    if (single) {
      setEditing({ index: 0 })
    } else if (options.includes(entry)) {
      setEditing(
        targetIndex === -1 ? { index: value.length } : { index: targetIndex },
      )
    } else {
      setEditing('append')
    }
    setCustom('')
    setComposing(false)
  }

  function commitCustom() {
    const entry = custom.trim()
    if (entry === '' || value.includes(entry)) return
    commit(entry)
  }

  function remove(item: string) {
    const idx = value.indexOf(item)
    const next = value.filter((_, i) => i !== idx)
    onChange(next)
    if (editing !== 'append' && editing.index >= next.length) {
      setEditing('append')
    }
  }

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="mt-1">
        <select
          id={id}
          value={selectValue}
          onChange={(e) => {
            const next = e.target.value
            if (next === CUSTOM) {
              setComposing(true)
            } else {
              commit(next)
            }
          }}
          className={inputClass}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option
              key={option}
              value={option}
              disabled={!single && value.includes(option)}
            >
              {option}
            </option>
          ))}
          <option value={CUSTOM}>{otroLabel}</option>
        </select>

        {composing && (
          <div className="mt-2">
            <input
              id={`${id}-otro`}
              aria-label={`${label}: otra opción`}
              maxLength={40}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitCustom()
                }
              }}
              onBlur={() => {
                if (custom.trim() === '') {
                  setComposing(false)
                  setCustom('')
                } else {
                  commitCustom()
                }
              }}
              placeholder="Escribe tu propia opción"
              className={inputClass}
            />
            {duplicate && (
              <p className="mt-1 text-xs text-fg-muted">
                Ya agregaste esta opción.
              </p>
            )}
          </div>
        )}
      </div>

      {!single && value.length > 0 && value.length < max && (
        <button
          type="button"
          onClick={() => {
            setEditing('append')
            setComposing(false)
            setCustom('')
          }}
          className="mt-1.5 text-xs font-semibold text-accent-hover hover:underline"
        >
          Añadir otro/a
        </button>
      )}

      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap items-center gap-1.5">
          {value.map((item) => (
            <li
              key={item}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${chipClassName}`}
            >
              {item}
              <button
                type="button"
                onClick={() => remove(item)}
                aria-label={`Quitar ${item}`}
                className="font-semibold leading-none opacity-70 hover:opacity-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}