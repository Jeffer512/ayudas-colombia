export const REPORT_TYPE_LABELS: Record<string, string> = {
  missing_person: 'Persona desaparecida',
  missing_pet: 'Mascota perdida',
  supplies_request: 'Solicitud de suministros',
  volunteers_request: 'Solicitud de voluntarios',
  shelter_request: 'Necesito refugio',
  shelter_offered: 'Refugio ofrecido',
  medical_request: 'Asistencia médica',
  damage_report: 'Daños en la zona',
  aid_offered: 'Ofrezco ayuda',
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