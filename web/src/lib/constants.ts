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
  needs_transport: 'Necesita transporte',
}

export const SUPPLIES_ITEM_OPTIONS = [
  'Agua potable',
  'Alimentación',
  'Salud y primeros auxilios',
  'Bebés y niños',
  'Higiene personal',
  'Ropa y calzado',
  'Limpieza',
  'Herramientas',
  'Mascotas',
  'Mantas y abrigo',
  'Energía y linternas',
  'Carpas y toldos',
]

export const VOLUNTEER_CAPABILITY_OPTIONS = [
  'Primeros auxilios',
  'Cocina',
  'Carga y descarga',
  'Atención al público',
  'Limpieza',
  'Cuidado de niños o mayores',
  'Rescate',
]

export const VEHICLE_TYPE_OPTIONS = [
  'Camioneta',
  'Camión',
  'Van o furgoneta',
  'Motocicleta',
  'Automóvil',
  'Bicicleta',
]

export const URGENCY_META: Record<string, { label: string; color: string }> = {
  critical: { label: 'Crítica', color: '#dc2626' },
  high: { label: 'Alta', color: '#ea580c' },
  medium: { label: 'Media', color: '#d97706' },
  low: { label: 'Baja', color: '#16a34a' },
}

export const REQUEST_STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  open: { label: 'Abierto', badgeClass: 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300' },
  resolved: { label: 'Resuelto', badgeClass: 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300' },
  duplicate: { label: 'Duplicado', badgeClass: 'bg-page dark:bg-white/10 text-text-muted' },
  invalid: { label: 'Inválido', badgeClass: 'bg-page dark:bg-white/10 text-text-muted' },
}

export const OFFER_STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  open: { label: 'Disponible', badgeClass: 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300' },
  in_transit: { label: 'En camino', badgeClass: 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300' },
  fulfilled: { label: 'Entregado', badgeClass: 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300' },
  unavailable: { label: 'Ya no disponible', badgeClass: 'bg-page dark:bg-white/10 text-text-muted' },
}

export const AVISO_STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  open: { label: 'Vigente', badgeClass: 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300' },
  closed: { label: 'Desactualizado', badgeClass: 'bg-page dark:bg-white/10 text-text-muted' },
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
  open: { label: 'Abierto', badgeClass: 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300' },
  closed: { label: 'Cerrado', badgeClass: 'bg-page dark:bg-white/10 text-text-muted' },
}

export const HELP_ORG_ITEM_KIND_LABELS: Record<HelpOrgItemKind, string> = {
  available: 'Tenemos disponible',
  needed: 'Necesitamos',
}

export const HELP_ORG_ITEM_KIND_BADGE: Record<
  HelpOrgItemKind,
  { badgeClass: string; textClass: string }
> = {
  available: { badgeClass: 'bg-emerald-100 dark:bg-emerald-950/40', textClass: 'text-emerald-800 dark:text-emerald-300' },
  needed: { badgeClass: 'bg-rose-100 dark:bg-rose-950/40', textClass: 'text-rose-800 dark:text-rose-300' },
}

export const CONTACT_VISIBILITY_LABELS: Record<string, string> = {
  public: 'Público',
  users: 'Solo usuarios registrados',
}

export const CONTACT_VISIBILITY_HINT: Record<string, string> = {
  public: 'Tu teléfono y correo los verá cualquiera que visite la página.',
  users:
    'Tu teléfono y correo solo lo verán personas con sesión iniciada. El resto ve la publicación sin contacto.',
}

export const OFFER_AUDIENCE_LABELS: Record<string, string> = {
  public: 'Público',
  users: 'Solo usuarios',
  orgs: 'Solo organizaciones',
}

export const OFFER_AUDIENCE_HINTS: Record<string, string> = {
  public: 'Tu oferta la ve cualquiera que visite la página.',
  users: 'Tu oferta solo la ven personas con sesión iniciada, no aparecerá para visitantes anónimos.',
  orgs: 'Tu oferta solo la ven miembros de organizaciones. Es ideal si buscas coordinación formal.',
}