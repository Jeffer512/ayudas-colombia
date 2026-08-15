import type { City } from '../lib/types'

export interface FilterSelectOption {
  value: string
  label: string
}

export interface FilterSelectConfig {
  key: string
  ariaLabel: string
  options: FilterSelectOption[]
}

interface FilterBarProps<T> {
  value: T
  searchLabel: string
  searchPlaceholder?: string
  cities: City[]
  selects: FilterSelectConfig[]
  onChange: (next: Record<string, string | undefined>) => void
}

const selectClass =
  'rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-text-muted focus:border-sky-500 focus:outline-none'

export default function FilterBar<T extends object>({
  value,
  searchLabel,
  searchPlaceholder = 'Buscar por palabra clave…',
  cities,
  selects,
  onChange,
}: FilterBarProps<T>) {
  const patch = (key: string, raw: string) =>
    onChange({ ...(value as object), [key]: raw || undefined })
  const current = value as object as Record<string, string | undefined>

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3 shadow-sm">
      <input
        type="search"
        placeholder={searchPlaceholder}
        value={current.q ?? ''}
        onChange={(e) => patch('q', e.target.value)}
        aria-label={searchLabel}
        className="min-w-48 flex-1 rounded-md border border-line bg-surface px-2 py-1.5 text-sm placeholder:text-text-muted focus:border-sky-500 focus:outline-none"
      />

      {selects.map((select) => (
        <select
          key={select.key}
          value={current[select.key] ?? ''}
          onChange={(e) => patch(select.key, e.target.value)}
          aria-label={select.ariaLabel}
          className={selectClass}
        >
          <option value="">{select.options[0].label}</option>
          {select.options.slice(1).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ))}

      <select
        value={current.city ?? ''}
        onChange={(e) => patch('city', e.target.value)}
        aria-label="Filtrar por ciudad"
        className={selectClass}
      >
        <option value="">Todas las ciudades</option>
        {cities.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}