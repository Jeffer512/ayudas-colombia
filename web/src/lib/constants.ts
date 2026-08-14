import type { HelpOrgItemKind, TransportOption } from './types'

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  missing_person: 'Persona desaparecida',
  missing_pet: 'Mascota perdida',
  supplies_request: 'Solicitud de suministros',
  volunteers_request: 'Solicitud de voluntarios',
  shelter_request: 'Necesito refugio',
  medical_request: 'Asistencia médica',
  transport_request: 'Necesito transporte',
}

export const OFFER_TYPE_LABELS: Record<string, string> = {
  supplies_offered: 'Ofrezco suministros',
  volunteers_offered: 'Me ofrezco como voluntario',
  shelter_offered: 'Refugio ofrecido',
  transport_offered: 'Ofrezco transporte',
}

export const AVISO_TYPE_LABELS: Record<string, string> = {
  info: 'Información / aviso',
}

export const TRANSPORT_OPTIONS: TransportOption[] = ['can_transport', 'needs_transport']

export const TRANSPORT_LABELS: Record<TransportOption, string> = {
  can_transport: 'Puedo transportar',
  needs_transport: 'Necesito transporte',
}

export const URGENCY_META: Record<string, { label: string; color: string }> = {
  critical: { label: 'Crítica', color: '#dc2626' },
  high: { label: 'Alta', color: '#ea580c' },
  medium: { label: 'Media', color: '#d97706' },
  low: { label: 'Baja', color: '#16a34a' },
}

export const REQUEST_STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  open: { label: 'Abierto', badgeClass: 'bg-blue-100 text-blue-800' },
  in_progress: {
    label: 'Siendo atendido',
    badgeClass: 'bg-amber-100 text-amber-800',
  },
  resolved: { label: 'Resuelto', badgeClass: 'bg-green-100 text-green-800' },
  duplicate: { label: 'Duplicado', badgeClass: 'bg-gray-200 text-gray-700' },
  invalid: { label: 'Inválido', badgeClass: 'bg-gray-200 text-gray-700' },
}

export const OFFER_STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  open: { label: 'Disponible', badgeClass: 'bg-green-100 text-green-800' },
  fulfilled: { label: 'Entregado', badgeClass: 'bg-blue-100 text-blue-800' },
  unavailable: { label: 'Ya no disponible', badgeClass: 'bg-gray-200 text-gray-700' },
}

export const AVISO_STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  open: { label: 'Vigente', badgeClass: 'bg-blue-100 text-blue-800' },
  closed: { label: 'Desactualizado', badgeClass: 'bg-gray-200 text-gray-700' },
}

export const MARKER_COLORS = {
  needs: '#dc2626',
  offers: '#16a34a',
  avisos: '#2563eb',
  helpOrgs: '#0d9488',
}

export const HELP_ORG_TYPE_LABELS: Record<string, string> = {
  ciudadano: 'Comunitaria',
  oficial: 'Coordinada por la red',
}

export const HELP_ORG_CATEGORY_LABELS: Record<string, string> = {
  acopio: 'Centro de acopio',
  psicologia: 'Apoyo psicológico',
  voluntarios: 'Voluntarios',
  albergue: 'Albergue',
  other: 'Otra ayuda',
}

export const HELP_ORG_STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  open: { label: 'Abierto', badgeClass: 'bg-green-100 text-green-800' },
  closed: { label: 'Cerrado', badgeClass: 'bg-gray-200 text-gray-700' },
}

export const HELP_ORG_ITEM_KIND_LABELS: Record<HelpOrgItemKind, string> = {
  available: 'Tenemos disponible',
  needed: 'Necesitamos',
}

export const HELP_ORG_ITEM_KIND_BADGE: Record<
  HelpOrgItemKind,
  { badgeClass: string; textClass: string }
> = {
  available: { badgeClass: 'bg-emerald-100', textClass: 'text-emerald-800' },
  needed: { badgeClass: 'bg-rose-100', textClass: 'text-rose-800' },
}