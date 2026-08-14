import type { AvisoFilters, City } from '../lib/types'
import { AVISO_STATUS_META, URGENCY_META } from '../lib/constants'
import FilterBar from './FilterBar'

interface AvisoFiltersProps {
  value: AvisoFilters
  cities: City[]
  onChange: (filters: AvisoFilters) => void
}

export default function AvisoFiltersUi({
  value,
  cities,
  onChange,
}: AvisoFiltersProps) {
  return (
    <FilterBar
      value={value}
      searchLabel="Buscar avisos"
      searchPlaceholder="Buscar en avisos…"
      cities={cities}
      selects={[
        {
          key: 'status',
          ariaLabel: 'Filtrar avisos por estado',
          options: [
            { value: '', label: 'Todos los estados' },
            { value: 'active', label: 'Vigentes' },
            ...Object.entries(AVISO_STATUS_META).map(([code, meta]) => ({
              value: code,
              label: meta.label,
            })),
          ],
        },
        {
          key: 'urgency',
          ariaLabel: 'Filtrar avisos por urgencia',
          options: [
            { value: '', label: 'Toda urgencia' },
            ...Object.entries(URGENCY_META).map(([code, meta]) => ({
              value: code,
              label: `Urgencia ${meta.label}`,
            })),
          ],
        },
      ]}
      onChange={(next) => onChange(next as AvisoFilters)}
    />
  )
}