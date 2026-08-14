const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

function plural(n: number, singular: string, pluralWord: string) {
  return n === 1 ? `1 ${singular}` : `${n} ${pluralWord}`
}

export function timeAgo(value: string): string {
  const seconds = Math.max(
    1,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000),
  )
  if (seconds < 60) return 'hace un momento'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${plural(minutes, 'minuto', 'minutos')}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${plural(hours, 'hora', 'horas')}`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${plural(days, 'día', 'días')}`
  const months = Math.floor(days / 30)
  if (months < 12) return `hace ${plural(months, 'mes', 'meses')}`
  return `hace ${plural(Math.floor(months / 12), 'año', 'años')}`
}

export function formatItemQuantity(
  quantity: number | null,
  unit: string | null,
): string {
  if (quantity !== null && quantity !== undefined) {
    return unit ? `${quantity} ${unit}` : String(quantity)
  }
  return unit ?? 'Sin cantidad'
}