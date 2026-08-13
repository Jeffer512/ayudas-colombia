export const REPORT_TYPES = [
  'missing_person',
  'missing_pet',
  'supplies_request',
  'volunteers_request',
  'shelter_request',
  'medical_request',
  'transport_request',
  'supplies_offered',
  'volunteers_offered',
  'shelter_offered',
  'transport_offered',
  'damage_report',
  'info',
] as const
export type ReportType = (typeof REPORT_TYPES)[number]
export type ReportTypeCode = ReportType

export const DIRECTIONS = ['need', 'offer', 'info'] as const
export type Direction = (typeof DIRECTIONS)[number]

export const TYPE_DIRECTION: Record<ReportType, Direction> = {
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

export const ACOPIO_TYPES = ['ciudadano', 'oficial'] as const
export type AcopioType = (typeof ACOPIO_TYPES)[number]

export const URGENCIES = ['critical', 'high', 'medium', 'low'] as const
export type Urgency = (typeof URGENCIES)[number]

export const STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'duplicate',
  'invalid',
] as const
export type Status = (typeof STATUSES)[number]

export const CONTACT_TYPES = ['individual', 'organization'] as const
export type ContactType = (typeof CONTACT_TYPES)[number]

export const ORGANIZATION_TYPES = [
  'shelter',
  'volunteer_group',
  'government',
  'ngo',
  'business',
  'other',
] as const
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number]