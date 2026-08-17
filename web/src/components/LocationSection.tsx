import type { Dispatch, SetStateAction } from 'react'
import { defaultCity } from '../lib/geo'
import type { City } from '../lib/types'
import Map from './Map'

const inputClass =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-sky-500 focus:outline-none'

const labelClass = 'text-sm font-medium text-text-muted'

interface LocationSectionProps {
  cities: City[]
  cityCode: string
  cityLocked?: boolean
  address: string
  lat: number | null
  lng: number | null
  addressPlaceholder?: string
  addressHint?: string
  onPatch: Dispatch<SetStateAction<{
    cityCode: string
    address: string
    lat: number | null
    lng: number | null
  }>>
}

export default function LocationSection({
  cities,
  cityCode,
  cityLocked = false,
  address,
  lat,
  lng,
  addressPlaceholder = 'Ej: Calle 12 #4-50, junto a la iglesia',
  addressHint,
  onPatch,
}: LocationSectionProps) {
  const cityLabel = cities.find((c) => c.code === cityCode)?.name ?? cityCode
  return (
    <fieldset className="rounded-lg border border-line bg-surface p-4">
      <legend className="px-1 text-sm font-semibold text-text-muted">
        Ubicación
      </legend>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cityCode" className={labelClass}>
            Ciudad
          </label>
          {cityLocked ? (
            <p className={`mt-1 ${inputClass}`}>{cityLabel}</p>
          ) : (
            <select
              id="cityCode"
              required
              value={cityCode}
              onChange={(e) => onPatch((prev) => ({ ...prev, cityCode: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            >
              {cities.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label htmlFor="address" className={labelClass}>
            Dirección o referencia
          </label>
          <input
            id="address"
            maxLength={300}
            placeholder={addressPlaceholder}
            value={address}
            onChange={(e) => onPatch((prev) => ({ ...prev, address: e.target.value }))}
            className={`mt-1 ${inputClass}`}
          />
          {addressHint && (
            <p className="mt-1 text-xs text-text-muted">{addressHint}</p>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm text-text-muted">
        Haz clic en el mapa para marcar el punto exacto (opcional).
      </p>
      <div className="mt-2">
        <Map
          center={{
            lat: defaultCity(cities)?.centerLat ?? 4.8133,
            lng: defaultCity(cities)?.centerLng ?? -75.6961,
          }}
          marker={lat !== null && lng !== null ? { lat, lng } : null}
          onPick={(pickedLat, pickedLng) =>
            onPatch((prev) => ({ ...prev, lat: pickedLat, lng: pickedLng }))
          }
        />
      </div>
      {lat !== null && lng !== null && (
        <p className="mt-1 text-xs text-text-muted">
          Punto marcado: {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}
    </fieldset>
  )
}