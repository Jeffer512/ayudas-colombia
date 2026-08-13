import type { City, ReportFilters } from '../lib/types'
import { REPORT_TYPE_LABELS, STATUS_META, URGENCY_META } from '../lib/constants'

const TYPE_OPTIONS = Object.entries(REPORT_TYPE_LABELS)
const URGENCY_OPTIONS = Object.entries(URGENCY_META)
const STATUS_OPTIONS: [string, string][] = [
  ['active', 'Activos'],
  ...Object.entries(STATUS_META).map(([code, meta]) => [code, meta.label] as [string, string]),
]

interface ReportFiltersProps {
  value: ReportFilters
  cities: City[]
  onChange: (filters: ReportFilters) => void
}

const selectClass =
  'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-sky-500 focus:outline-none'

export default function ReportFilters({
  value,
  cities,
  onChange,
}: ReportFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <input
        type="search"
        placeholder="Buscar por palabra clave…"
        value={value.q ?? ''}
        onChange={(e) => onChange({ ...value, q: e.target.value })}
        aria-label="Buscar reportes"
        className="min-w-48 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none"
      />

      <select
        value={value.type ?? ''}
        onChange={(e) =>
          onChange({ ...value, type: (e.target.value || undefined) as ReportFilters['type'] })
        }
        aria-label="Filtrar por tipo"
        className={selectClass}
      >
        <option value="">Todos los tipos</option>
        {TYPE_OPTIONS.map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>

      <select
        value={value.status ?? ''}
        onChange={(e) =>
          onChange({
            ...value,
            status: (e.target.value || undefined) as ReportFilters['status'],
          })
        }
        aria-label="Filtrar por estado"
        className={selectClass}
      >
        <option value="">Todos los estados</option>
        {STATUS_OPTIONS.map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>

      <select
        value={value.urgency ?? ''}
        onChange={(e) =>
          onChange({
            ...value,
            urgency: (e.target.value || undefined) as ReportFilters['urgency'],
          })
        }
        aria-label="Filtrar por urgencia"
        className={selectClass}
      >
        <option value="">Toda urgencia</option>
        {URGENCY_OPTIONS.map(([code, { label }]) => (
          <option key={code} value={code}>
            Urgencia {label}
          </option>
        ))}
      </select>

      <select
        value={value.city ?? ''}
        onChange={(e) =>
          onChange({ ...value, city: e.target.value || undefined })
        }
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