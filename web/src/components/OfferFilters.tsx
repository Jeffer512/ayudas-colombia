import type { City, OfferFilters } from '../lib/types'
import { OFFER_STATUS_META, OFFER_TYPE_LABELS } from '../lib/constants'
import FilterBar from './FilterBar'

interface OfferFiltersProps {
  value: OfferFilters
  cities: City[]
  onChange: (filters: OfferFilters) => void
}

export default function OfferFiltersUi({
  value,
  cities,
  onChange,
}: OfferFiltersProps) {
  return (
    <FilterBar
      value={value}
      searchLabel="Buscar ofertas"
      searchPlaceholder="Buscar en ofertas…"
      cities={cities}
      selects={[
        {
          key: 'type',
          ariaLabel: 'Filtrar ofertas por tipo',
          options: [
            { value: '', label: 'Todos los tipos' },
            ...Object.entries(OFFER_TYPE_LABELS).map(([code, label]) => ({
              value: code,
              label,
            })),
          ],
        },
        {
          key: 'status',
          ariaLabel: 'Filtrar ofertas por estado',
          options: [
            { value: '', label: 'Todos los estados' },
            { value: 'active', label: 'Disponibles' },
            ...Object.entries(OFFER_STATUS_META).map(([code, meta]) => ({
              value: code,
              label: meta.label,
            })),
          ],
        },
      ]}
      onChange={(next) => onChange(next as OfferFilters)}
    />
  )
}