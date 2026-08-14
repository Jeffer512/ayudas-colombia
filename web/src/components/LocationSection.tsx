import type { Dispatch, SetStateAction } from 'react'
import type { City } from '../lib/types'
import Map from './Map'

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none'

const labelClass = 'text-sm font-medium text-slate-700'

interface LocationSectionProps {
  cities: City[]
  cityCode: string
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
  address,
  lat,
  lng,
  addressPlaceholder = 'Ej: Calle 12 #4-50, junto a la iglesia',
  addressHint,
  onPatch,
}: LocationSectionProps) {
  return (
    <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-700">
        Ubicación
      </legend>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cityCode" className={labelClass}>
            Ciudad
          </label>
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
            <p className="mt-1 text-xs text-slate-500">{addressHint}</p>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-600">
        Haz clic en el mapa para marcar el punto exacto (opcional).
      </p>
      <div className="mt-2">
        <Map
          center={{
            lat: cities[0]?.centerLat ?? 4.8133,
            lng: cities[0]?.centerLng ?? -75.6961,
          }}
          marker={lat !== null && lng !== null ? { lat, lng } : null}
          onPick={(pickedLat, pickedLng) =>
            onPatch((prev) => ({ ...prev, lat: pickedLat, lng: pickedLng }))
          }
        />
      </div>
      {lat !== null && lng !== null && (
        <p className="mt-1 text-xs text-slate-500">
          Punto marcado: {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}
    </fieldset>
  )
}