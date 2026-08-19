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

export const HELPER_STATUS_LABELS: Record<string, string> = {
  offered: 'Ofreció su ayuda',
  accepted: 'Entrega en camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export const FAR_AWAY_DESTINATION_LABEL = 'Donde se necesite'

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
  critical: { label: 'Crítica', color: 'var(--status-critical)' },
  high: { label: 'Alta', color: 'var(--status-high)' },
  medium: { label: 'Media', color: 'var(--status-medium)' },
  low: { label: 'Baja', color: 'var(--status-low)' },
}

export const REQUEST_STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  open: { label: 'Abierto', badgeClass: 'bg-primary-muted text-primary' },
  resolved: { label: 'Resuelto', badgeClass: 'bg-accent-muted text-accent-hover' },
  duplicate: { label: 'Duplicado', badgeClass: 'bg-surface-2 text-fg-muted' },
  invalid: { label: 'Inválido', badgeClass: 'bg-surface-2 text-fg-muted' },
}

export const OFFER_STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  open: { label: 'Disponible', badgeClass: 'bg-accent-muted text-accent-hover' },
  in_transit: { label: 'En camino', badgeClass: 'bg-warning-muted text-warning' },
  fulfilled: { label: 'Entregado', badgeClass: 'bg-primary-muted text-primary' },
  unavailable: { label: 'Ya no disponible', badgeClass: 'bg-surface-2 text-fg-muted' },
}

export const AVISO_STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  open: { label: 'Vigente', badgeClass: 'bg-primary-muted text-primary' },
  closed: { label: 'Desactualizado', badgeClass: 'bg-surface-2 text-fg-muted' },
}

export const MARKER_COLORS = {
  needs: 'var(--marker-needs)',
  offers: 'var(--marker-offers)',
  avisos: 'var(--marker-avisos)',
  helpOrgs: 'var(--marker-helpOrgs)',
}

export const HELP_ORG_TYPE_LABELS: Record<string, string> = {
  ciudadano: 'Comunitaria',
  oficial: 'Oficial',
}

export const HELP_ORG_MANAGED_LABEL = 'Gestionada por su equipo'

export const HELP_ORG_CATEGORY_LABELS: Record<string, string> = {
  acopio: 'Centro de acopio',
  psicologia: 'Apoyo psicológico',
  voluntarios: 'Voluntarios',
  albergue: 'Albergue',
  other: 'Otra ayuda',
}

export const HELP_ORG_ITEM_KIND_LABELS: Record<HelpOrgItemKind, string> = {
  available: 'Tenemos disponible',
  needed: 'Necesitamos',
}

export const HELP_ORG_ITEM_KIND_BADGE: Record<
  HelpOrgItemKind,
  { badgeClass: string; textClass: string }
> = {
  available: { badgeClass: 'bg-accent-muted', textClass: 'text-accent-hover' },
  needed: { badgeClass: 'bg-danger-muted', textClass: 'text-danger' },
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