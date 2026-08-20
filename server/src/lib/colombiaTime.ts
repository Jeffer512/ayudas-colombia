const COLOMBIA_OFFSET_MS = 5 * 60 * 60 * 1000

export function colombiaNow(): Date {
  return new Date(Date.now() - COLOMBIA_OFFSET_MS)
}

export function colombiaDayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}