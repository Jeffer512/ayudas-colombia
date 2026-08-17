import type { City } from './types'

export function defaultCity(cities: City[]): City | undefined {
  return cities.find((c) => c.code === 'pereira') ?? cities[0]
}

export function getPosition(timeoutMs = 7000): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (
      typeof navigator === 'undefined' ||
      typeof navigator.geolocation === 'undefined'
    ) {
      reject(new Error('geolocation no disponible'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      reject,
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 10_000 },
    )
  })
}

export function cityCenter(
  cityCode: string | undefined,
  cities: City[],
): { lat: number; lng: number } {
  const city = cities.find((c) => c.code === cityCode)
  if (city && city.centerLat !== null && city.centerLng !== null) {
    return { lat: city.centerLat, lng: city.centerLng }
  }
  const fallback = defaultCity(cities)
  return {
    lat: fallback?.centerLat ?? 4.8133,
    lng: fallback?.centerLng ?? -75.6961,
  }
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

const EARTH_RADIUS_KM = 6371

export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function nearestCity(
  point: { lat: number; lng: number },
  cities: City[],
  maxDistanceKm: number,
): City | undefined {
  let nearest: City | undefined
  let best = Infinity
  for (const city of cities) {
    if (city.centerLat === null || city.centerLng === null) continue
    const d = distanceKm(point.lat, point.lng, city.centerLat, city.centerLng)
    if (d <= maxDistanceKm && d < best) {
      nearest = city
      best = d
    }
  }
  return nearest
}