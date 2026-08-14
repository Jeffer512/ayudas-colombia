import type { City, RequestFilters } from '../lib/types'
import { REQUEST_STATUS_META, REQUEST_TYPE_LABELS, URGENCY_META } from '../lib/constants'
import FilterBar from './FilterBar'

interface RequestFiltersProps {
  value: RequestFilters
  cities: City[]
  onChange: (filters: RequestFilters) => void
}

export default function RequestFiltersUi({
  value,
  cities,
  onChange,
}: RequestFiltersProps) {
  return (
    <FilterBar
      value={value}
      searchLabel="Buscar solicitudes"
      searchPlaceholder="Buscar en pedidos…"
      cities={cities}
      selects={[
        {
          key: 'type',
          ariaLabel: 'Filtrar pedidos por tipo',
          options: [
            { value: '', label: 'Todos los tipos' },
            ...Object.entries(REQUEST_TYPE_LABELS).map(([code, label]) => ({
              value: code,
              label,
            })),
          ],
        },
        {
          key: 'status',
          ariaLabel: 'Filtrar pedidos por estado',
          options: [
            { value: '', label: 'Todos los estados' },
            { value: 'active', label: 'Activos' },
            ...Object.entries(REQUEST_STATUS_META).map(([code, meta]) => ({
              value: code,
              label: meta.label,
            })),
          ],
        },
        {
          key: 'urgency',
          ariaLabel: 'Filtrar pedidos por urgencia',
          options: [
            { value: '', label: 'Toda urgencia' },
            ...Object.entries(URGENCY_META).map(([code, meta]) => ({
              value: code,
              label: `Urgencia ${meta.label}`,
            })),
          ],
        },
      ]}
      onChange={(next) => onChange(next as RequestFilters)}
    />
  )
}