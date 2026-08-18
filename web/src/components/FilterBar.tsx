import { Search, X } from 'lucide-react'
import type { City } from '../lib/types'
import { Input, Select } from './ui/Input'

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
  count?: number
  onChange: (next: Record<string, string | undefined>) => void
}

export default function FilterBar<T extends object>({
  value,
  searchLabel,
  searchPlaceholder = 'Buscar por palabra clave…',
  cities,
  selects,
  count,
  onChange,
}: FilterBarProps<T>) {
  const patch = (key: string, raw: string) =>
    onChange({ ...(value as object), [key]: raw || undefined })
  const current = value as object as Record<string, string | undefined>
  const hasFilters = Boolean(
    current.q || selects.some((s) => current[s.key]) || current.city,
  )
  const clear = () => {
    const cleared: Record<string, undefined> = {}
    for (const key of Object.keys(current)) cleared[key] = undefined
    onChange(cleared)
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={current.q ?? ''}
            onChange={(e) => patch('q', e.target.value)}
            aria-label={searchLabel}
            className="pl-9"
          />
        </div>
        {count !== undefined && (
          <span className="text-sm text-fg-muted" aria-live="polite">
            {count} resultado{count === 1 ? '' : 's'}
          </span>
        )}
        {hasFilters && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-sm text-fg-muted transition duration-fast hover:bg-surface-2 hover:text-fg"
          >
            <X size={14} aria-hidden="true" />
            Limpiar
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {selects.map((select) => (
          <Select
            key={select.key}
            value={current[select.key] ?? ''}
            onChange={(e) => patch(select.key, e.target.value)}
            aria-label={select.ariaLabel}
            className="w-auto"
          >
            <option value="">{select.options[0].label}</option>
            {select.options.slice(1).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        ))}

        <Select
          value={current.city ?? ''}
          onChange={(e) => patch('city', e.target.value)}
          aria-label="Filtrar por ciudad"
          className="w-auto"
        >
          <option value="">Todas las ciudades</option>
          {cities.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  )
}