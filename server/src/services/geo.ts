import { ApiError } from '../lib/errors.js'

interface IpGeoLiteResult {
  lat: number | null
  lng: number | null
  city: string | null
  region: string | null
  country: string | null
}

export async function getGeo(ip?: string): Promise<IpGeoLiteResult> {
  const query = [`status`, `lat`, `lon`, `city`, `regionName`, `country`].join(',')
  const url = `http://ip-api.com/json/${encodeURIComponent(ip ?? '')}?fields=${query}`
  let data: Record<string, unknown>
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(2500),
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`ip-api responded ${response.status}`)
    data = (await response.json()) as Record<string, unknown>
  } catch {
    throw new ApiError(502, 'No se pudo detectar la ubicación')
  }
  if (data.status !== 'success' || typeof data.lat !== 'number' || typeof data.lon !== 'number') {
    throw new ApiError(502, 'No se pudo detectar la ubicación')
  }
  return {
    lat: data.lat,
    lng: data.lon,
    city: typeof data.city === 'string' ? data.city : null,
    region: typeof data.regionName === 'string' ? data.regionName : null,
    country: typeof data.country === 'string' ? data.country : null,
  }
}