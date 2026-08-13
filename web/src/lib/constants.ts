import type { Direction } from './types'

export const DIRECTION_LABELS: Record<Direction, string> = {
  need: 'Necesito ayuda',
  offer: 'Ofrezco ayuda',
  info: 'Información',
}

export const DIRECTION_META: Record<Direction, { label: string; color: string }> = {
  need: { label: 'Necesito ayuda', color: '#dc2626' },
  offer: { label: 'Ofrezco ayuda', color: '#16a34a' },
  info: { label: 'Información', color: '#2563eb' },
}

export const TYPE_DIRECTION: Record<string, Direction> = {
  missing_person: 'need',
  missing_pet: 'need',
  supplies_request: 'need',
  volunteers_request: 'need',
  shelter_request: 'need',
  medical_request: 'need',
  transport_request: 'need',
  supplies_offered: 'offer',
  volunteers_offered: 'offer',
  shelter_offered: 'offer',
  transport_offered: 'offer',
  damage_report: 'info',
  info: 'info',
}

export const REPORT_TYPE_LABELS: Record<string, string> = {
  missing_person: 'Persona desaparecida',
  missing_pet: 'Mascota perdida',
  supplies_request: 'Solicitud de suministros',
  volunteers_request: 'Solicitud de voluntarios',
  shelter_request: 'Necesito refugio',
  medical_request: 'Asistencia médica',
  transport_request: 'Necesito transporte',
  supplies_offered: 'Ofrezco suministros',
  volunteers_offered: 'Ofrezco voluntarios',
  shelter_offered: 'Refugio ofrecido',
  transport_offered: 'Ofrezco transporte',
  damage_report: 'Daños en la zona',
  info: 'Información',
}

export const URGENCY_META: Record<string, { label: string; color: string }> = {
  critical: { label: 'Crítica', color: '#dc2626' },
  high: { label: 'Alta', color: '#ea580c' },
  medium: { label: 'Media', color: '#d97706' },
  low: { label: 'Baja', color: '#16a34a' },
}

export const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  open: { label: 'Abierto', badgeClass: 'bg-blue-100 text-blue-800' },
  in_progress: {
    label: 'Siendo atendido',
    badgeClass: 'bg-amber-100 text-amber-800',
  },
  resolved: { label: 'Resuelto', badgeClass: 'bg-green-100 text-green-800' },
  duplicate: { label: 'Duplicado', badgeClass: 'bg-gray-200 text-gray-700' },
  invalid: { label: 'Inválido', badgeClass: 'bg-gray-200 text-gray-700' },
}

export const ACOPIO_TYPE_LABELS: Record<string, string> = {
  ciudadano: 'Centro ciudadano',
  oficial: 'Centro oficial',
}

export const ACOPIO_STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  open: { label: 'Abierto', badgeClass: 'bg-green-100 text-green-800' },
  closed: { label: 'Cerrado', badgeClass: 'bg-gray-200 text-gray-700' },
}

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  individual: 'Persona',
  organization: 'Organización',
}

export const ORGANIZATION_TYPE_LABELS: Record<string, string> = {
  shelter: 'Refugio',
  volunteer_group: 'Grupo de voluntarios',
  government: 'Gobierno / entidad oficial',
  ngo: 'ONG',
  business: 'Empresa / comercio',
  other: 'Otra',
}